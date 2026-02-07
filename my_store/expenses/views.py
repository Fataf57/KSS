from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import HttpResponse
from django.conf import settings
from datetime import datetime
from decimal import Decimal
import io
import logging
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from .models import Depense, PeriodStop
from .serializers import (
    DepenseSerializer,
    DepenseCreateSerializer,
    DepenseListSerializer,
    PeriodStopSerializer,
    PeriodStopCreateSerializer,
)


class DepenseViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les dépenses"""
    queryset = Depense.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return DepenseCreateSerializer
        elif self.action == 'list':
            return DepenseListSerializer
        return DepenseSerializer

    def get_queryset(self):
        queryset = Depense.objects.all()

        # Filtres
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        search = self.request.query_params.get('search', None)

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if search:
            queryset = queryset.filter(nom_depense__icontains=search)

        return queryset

    def perform_create(self, serializer):
        # Si l'utilisateur est authentifié, l'associer à la dépense
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save(created_by=None)

    @action(detail=False, methods=['get'])
    def total(self, request):
        """Calculer le total des dépenses"""
        queryset = self.get_queryset()
        total = sum(depense.somme for depense in queryset)
        return Response({'total': float(total)})

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Génère un PDF des dépenses pour une période donnée"""
        try:
            queryset = self.get_queryset()
            
            # Filtrer les lignes "FIN DE COMPTE" du queryset pour le PDF
            queryset = queryset.exclude(nom_depense__startswith='FIN DE COMPTE')
            
            # Créer le buffer pour le PDF
            buffer = io.BytesIO()
            # Largeur de page A4 en points (595.27 points = 8.27 inches)
            # Avec marges de 30 points de chaque côté, largeur disponible = 535.27 points
            page_width = A4[0] - 60  # Largeur disponible après marges
            doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
            
            # Conteneur pour les éléments du PDF
            elements = []
            
            # Styles
            styles = getSampleStyleSheet()
            
            # En-tête de l'entreprise
            header_style = ParagraphStyle(
                'HeaderStyle',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#000000'),
                alignment=TA_LEFT,
                fontName='Helvetica-Bold'
            )
            
            header_right_style = ParagraphStyle(
                'HeaderRightStyle',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#000000'),
                alignment=TA_RIGHT,
                fontName='Helvetica-Bold'
            )
            
            # Créer un tableau pour l'en-tête (2 colonnes)
            # Largeur disponible = 535.27 points ≈ 7.4 inches
            header_data = [
                [
                    Paragraph("ETABLISSEMENT KADER SAWADOGO<br/>ET FRERE", header_style),
                    Paragraph("BURKINA FASSO<br/>LA PATRIE OU LA MORT<br/>NOUS VAINCRONS", header_right_style)
                ],
                [
                    Paragraph("Tel BF    : +226 75 58 57 76 | 76 54 71 71<br/>Tel Mali : +223 73 73 73 44 | 74 52 11 47", styles['Normal']),
                    ""
                ]
            ]
            
            # Utiliser des largeurs qui s'adaptent à la page
            header_table = Table(header_data, colWidths=[page_width/2, page_width/2])
            header_table_style = TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ])
            header_table.setStyle(header_table_style)
            elements.append(header_table)
            
            # Ligne de séparation
            elements.append(Spacer(1, 0.1*inch))
            separator = Table([['']], colWidths=[page_width])
            separator_style = TableStyle([
                ('LINEBELOW', (0, 0), (0, 0), 0.5, colors.black),
            ])
            separator.setStyle(separator_style)
            elements.append(separator)
            elements.append(Spacer(1, 0.2*inch))
            
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                textColor=colors.HexColor('#1a1a1a'),
                spaceAfter=30,
                alignment=TA_CENTER
            )
            
            # Titre
            title = Paragraph("Rapport des Dépenses", title_style)
            elements.append(title)
            elements.append(Spacer(1, 0.2*inch))
            
            # Informations de période
            date_from = request.query_params.get('date_from', None)
            date_to = request.query_params.get('date_to', None)
            
            period_text = "Période : "
            if date_from and date_to:
                period_text += f"Du {date_from} au {date_to}"
            elif date_from:
                period_text += f"À partir du {date_from}"
            elif date_to:
                period_text += f"Jusqu'au {date_to}"
            else:
                period_text += "Toutes les dépenses"
            
            period_para = Paragraph(period_text, styles['Normal'])
            elements.append(period_para)
            elements.append(Spacer(1, 0.3*inch))
            
            # Préparer les données du tableau
            data = [['Date', 'Nom de la dépense', 'Somme (FCFA)']]
            
            total = Decimal('0.00')
            for depense in queryset:
                try:
                    date_str = depense.date.strftime('%d/%m/%Y') if depense.date else 'N/A'
                    nom = depense.nom_depense or 'Sans nom'
                    somme = depense.somme or Decimal('0.00')
                    total += Decimal(str(somme))
                    
                    # Formater la somme avec des espaces pour les milliers
                    somme_str = f"{float(somme):,.2f}".replace(',', ' ').replace('.', ',')
                    
                    data.append([date_str, nom, somme_str])
                except Exception as e:
                    # Ignorer les lignes avec des erreurs et continuer
                    continue
            
            # Vérifier qu'il y a des données
            if len(data) <= 1:
                return Response(
                    {'error': 'Aucune dépense à exporter pour cette période'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Ajouter la ligne de total
            total_str = f"{float(total):,.2f}".replace(',', ' ').replace('.', ',')
            data.append(['', 'TOTAL', total_str])
            
            # Créer le tableau
            table = Table(data, colWidths=[1.5*inch, 3.5*inch, 1.5*inch])
            
            # Style du tableau
            table_style = TableStyle([
                # En-tête
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#000000')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                
                # Lignes de données
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -2), 10),
                ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f9f9f9')]),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 1), (-1, -2), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -2), 8),
                
                # Ligne de total
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e0e0e0')),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 12),
                ('TOPPADDING', (0, -1), (-1, -1), 12),
                ('BOTTOMPADDING', (0, -1), (-1, -1), 12),
            ])
            
            table.setStyle(table_style)
            elements.append(table)
            
            # Date de génération
            elements.append(Spacer(1, 0.3*inch))
            date_gen = Paragraph(
                f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}",
                styles['Normal']
            )
            elements.append(date_gen)
            
            # Construire le PDF
            doc.build(elements)
            
            # Récupérer le PDF depuis le buffer
            buffer.seek(0)
            pdf_data = buffer.read()
            buffer.close()
            
            # Créer la réponse HTTP
            filename = f"depenses_{date_from or 'all'}_{date_to or 'all'}.pdf"
            response = HttpResponse(pdf_data, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            # Logger l'erreur pour le débogage
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur lors de la génération du PDF: {str(e)}")
            logger.error(error_trace)
            # Retourner une réponse JSON avec l'erreur
            return Response(
                {
                    'error': f'Erreur lors de la génération du PDF: {str(e)}',
                    'message': str(e),
                    'details': error_trace if settings.DEBUG else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PeriodStopViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les arrêts de compte"""
    queryset = PeriodStop.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'create':
            return PeriodStopCreateSerializer
        return PeriodStopSerializer

    def perform_create(self, serializer):
        # Si l'utilisateur est authentifié, l'associer à l'arrêt
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save(created_by=None)

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """Supprimer tous les arrêts de compte"""
        PeriodStop.objects.all().delete()
        return Response({'message': 'Tous les arrêts de compte ont été supprimés'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='replace-all')
    def replace_all(self, request):
        """Remplacer tous les arrêts de compte par une nouvelle liste"""
        try:
            stops = request.data.get('stops', [])
            if not isinstance(stops, list):
                return Response({'error': 'stops doit être une liste'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Supprimer tous les arrêts existants
            PeriodStop.objects.all().delete()
            
            # Créer les nouveaux arrêts
            created_stops = []
            for stop_index in stops:
                if isinstance(stop_index, int):
                    period_stop = PeriodStop.objects.create(
                        stop_index=stop_index,
                        created_by=self.request.user if self.request.user.is_authenticated else None
                    )
                    created_stops.append(period_stop)
            
            serializer = PeriodStopSerializer(created_stops, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
