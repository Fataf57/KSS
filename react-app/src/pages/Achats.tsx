import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShoppingCart, Plus, Trash2, Save, Loader2, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface LigneAchat {
  id?: number;
  produit?: number | null;
  nom_produit: string;
  gros: number;
  unit: number;
  quantite_kg: number;
  prix_unitaire: number;
  montant?: number;
}

interface EntreeAchat {
  id?: number;
  numero_entree?: string;
  date: string;
  client?: number | null;
  nom_client: string;
  charge: number;
  avance: number;
  restant: number;
  paye?: number; // Ce qu'on a payé
  montant_ht?: number;
  montant_net?: number;
  achats?: LigneAchat[];
}

interface Client {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
}

interface Product {
  id: number;
  name: string;
}

export default function Achats() {
  const [entrees, setEntrees] = useState<EntreeAchat[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [produits, setProduits] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEntree, setNewEntree] = useState<EntreeAchat>({
    date: new Date().toISOString().split('T')[0],
    nom_client: "",
    charge: 0,
    avance: 0,
    restant: 0,
    paye: 0,
    achats: [
      {
        nom_produit: "",
        gros: 0,
        unit: 0,
        quantite_kg: 0,
        prix_unitaire: 0,
        montant: 0,
      },
    ],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEntrees();
    fetchClients();
    fetchProduits();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch(getApiUrl("customers/"));
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des clients:", error);
    }
  };

  const fetchProduits = async () => {
    try {
      const response = await fetch(getApiUrl("products/"));
      if (response.ok) {
        const data = await response.json();
        setProduits(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des produits:", error);
    }
  };

  const fetchEntrees = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl("entrees-achat/"));
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map((entree: EntreeAchat) => ({
          ...entree,
          date: entree.date ? entree.date.split('T')[0] : new Date().toISOString().split('T')[0],
        }));
        setEntrees(formattedData);
      } else {
        throw new Error("Erreur lors du chargement des entrées");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les entrées d'achat",
        variant: "destructive",
      });
      setEntrees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setNewEntree({
      date: new Date().toISOString().split('T')[0],
      nom_client: "",
      charge: 0,
      avance: 0,
      restant: 0,
      paye: 0,
      achats: [
        {
          nom_produit: "",
          gros: 0,
          unit: 0,
          quantite_kg: 0,
          prix_unitaire: 0,
          montant: 0,
        },
      ],
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setNewEntree({
      date: new Date().toISOString().split('T')[0],
      nom_client: "",
      numero_entree: "",
      charge: 0,
      avance: 0,
      restant: 0,
      paye: 0,
      achats: [
        {
          nom_produit: "",
          gros: 0,
          unit: 0,
          quantite_kg: 0,
          prix_unitaire: 0,
          montant: 0,
        },
      ],
    });
  };

  const handleAddLigne = () => {
    const newLigne: LigneAchat = {
      nom_produit: "",
      gros: 0,
      unit: 0,
      quantite_kg: 0,
      prix_unitaire: 0,
      montant: 0,
    };
    setNewEntree({
      ...newEntree,
      achats: [...(newEntree.achats || []), newLigne],
    });
  };

  const handleRemoveLigne = (index: number) => {
    const newAchats = newEntree.achats?.filter((_, i) => i !== index) || [];
    setNewEntree({ ...newEntree, achats: newAchats });
  };

  const handleUpdateLigne = (index: number, field: keyof LigneAchat, value: string | number | null) => {
    const newAchats = [...(newEntree.achats || [])];
    
    // Si c'est un champ texte (nom_produit), garder la valeur telle quelle
    if (field === 'nom_produit') {
      newAchats[index] = { ...newAchats[index], [field]: value as string };
    } else {
      // Pour les champs numériques, convertir en nombre
      const numValue = value === "" || value === null ? 0 : Number(value);
      newAchats[index] = { ...newAchats[index], [field]: numValue };
      
      // Calculer automatiquement la quantité (Tonnage) = Nbr sac × Poids sac
      if (field === 'gros' || field === 'unit') {
        const gros = field === 'gros' ? numValue : (newAchats[index].gros || 0);
        const unit = field === 'unit' ? numValue : (newAchats[index].unit || 0);
        newAchats[index].quantite_kg = gros * unit;
      }
      
      // Calculer le montant automatiquement
      const quantite = newAchats[index].quantite_kg || 0;
      const prix = newAchats[index].prix_unitaire || 0;
      newAchats[index].montant = quantite * prix;
    }
    
    setNewEntree({ ...newEntree, achats: newAchats });
  };

  const calculateTotal = () => {
    return newEntree.achats?.reduce((sum, ligne) => sum + (ligne.montant || 0), 0) || 0;
  };

  const calculateTotalNet = () => {
    const total = calculateTotal();
    return total - (newEntree.charge || 0) - (newEntree.avance || 0) + (newEntree.restant || 0);
  };

  const calculateSommeRestante = () => {
    const totalNet = calculateTotalNet();
    const paye = newEntree.paye || 0; // Somme payée
    return totalNet - paye; // Somme restante = TOTAL NET - Somme payée
  };

  const handleAddEntree = async () => {
    // Validation - permettre l'enregistrement même si tout est vide
    const isEntreeEmpty = (!newEntree.nom_client?.trim() && !newEntree.client) &&
                          (!newEntree.achats || newEntree.achats.length === 0);
    if (isEntreeEmpty) {
      // Permettre l'enregistrement d'une entrée vide
    } else {
      // Si au moins un champ est rempli, valider les champs requis
      if (!newEntree.nom_client.trim() && !newEntree.client) {
        toast({
          title: "Erreur",
          description: "Le nom du client est requis",
          variant: "destructive",
        });
        return;
      }

      // Valider chaque ligne - permettre les lignes vides
      for (let i = 0; i < newEntree.achats.length; i++) {
        const ligne = newEntree.achats[i];
        // Permettre l'enregistrement si la ligne est complètement vide
        const isLigneEmpty = !ligne.nom_produit?.trim() && 
                            (!ligne.quantite_kg || ligne.quantite_kg <= 0) &&
                            (!ligne.gros || ligne.gros === 0) && (!ligne.unit || ligne.unit === 0);
        if (isLigneEmpty) {
          continue; // Passer à la ligne suivante si cette ligne est vide
        }
        
        // Si au moins un champ est rempli, valider les champs requis
        if (!ligne.nom_produit.trim()) {
          toast({
            title: "Erreur",
            description: `La ligne ${i + 1} : Le nom du produit est requis`,
            variant: "destructive",
          });
          return;
        }
        if (ligne.quantite_kg <= 0) {
          toast({
            title: "Erreur",
            description: `La ligne ${i + 1} : La quantité doit être positive`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      // Le numéro d'entrée sera généré automatiquement par le backend (séquentiel à partir de 1)
      const payload = {
        numero_entree: newEntree.numero_entree?.trim() || "",
        date: newEntree.date,
        client: newEntree.client || null,
        nom_client: newEntree.client ? "" : newEntree.nom_client.trim(),
        transport: 0,
        autres_charges: Number(newEntree.charge) || 0,
        avance: Number(newEntree.avance) || 0,
        restant: Number(newEntree.restant) || 0,
        paye: Number(newEntree.paye) || 0,
        achats: newEntree.achats.map((ligne) => ({
          date: newEntree.date,
          produit: null,
          nom_produit: ligne.nom_produit.trim(),
          gros: Number(ligne.gros) || 0,
          unit: Number(ligne.unit) || 0,
          quantite_kg: Number(ligne.quantite_kg),
          prix_unitaire: Number(ligne.prix_unitaire),
        })),
      };

      const response = await fetch(getApiUrl("entrees-achat/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail || errorData.message) {
            errorMessage = errorData.detail || errorData.message;
          } else if (typeof errorData === "object" && errorData !== null) {
            const firstKey = Object.keys(errorData)[0];
            const firstVal = (errorData as any)[firstKey];

            if (Array.isArray(firstVal)) {
              const firstItem = firstVal[0];
              if (typeof firstItem === "string") {
                errorMessage = `${firstKey} : ${firstItem}`;
              } else if (typeof firstItem === "object" && firstItem !== null) {
                const nestedKey = Object.keys(firstItem)[0];
                const nestedVal = (firstItem as any)[nestedKey];
                if (Array.isArray(nestedVal) && nestedVal[0]) {
                  errorMessage = `${firstKey} -> ${nestedKey} : ${nestedVal[0]}`;
                } else if (typeof nestedVal === "string") {
                  errorMessage = `${firstKey} -> ${nestedKey} : ${nestedVal}`;
                } else {
                  errorMessage = `${firstKey} : ${JSON.stringify(firstItem)}`;
                }
              } else {
                errorMessage = `${firstKey} : ${String(firstItem)}`;
              }
            } else if (typeof firstVal === "string") {
              errorMessage = `${firstKey} : ${firstVal}`;
            } else {
              errorMessage = JSON.stringify(errorData);
            }
          }
        } catch (e) {
          console.error("Erreur lors du parsing:", e);
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Succès !",
        description: "Entrée d'achat ajoutée avec succès",
      });

      setIsDialogOpen(false);
      handleCloseDialog();
      fetchEntrees();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de Enregistrer l'entrée d'achat",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée d'achat ?")) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(getApiUrl(`entrees-achat/${id}/`), {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      toast({
        title: "Succès !",
        description: "Entrée d'achat supprimée",
      });

      fetchEntrees();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'entrée d'achat",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = async (entree: EntreeAchat) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10; // Marges réduites pour plus d'espace
      
      // En-tête avec logo et informations de l'entreprise
      const startY = margin;
      
      // Logo au centre
      const logoHeight = 25;
      const logoWidth = 35;
      const logoX = (pageWidth - logoWidth) / 2;
      try {
        const logoResponse = await fetch('/ksslogo.jpeg');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoUrl = URL.createObjectURL(logoBlob);
          doc.addImage(logoUrl, 'JPEG', logoX, startY, logoWidth, logoHeight);
          URL.revokeObjectURL(logoUrl);
        }
      } catch (e) {
        console.warn("Logo non trouvé, continuation sans logo", e);
      }
      
      // Ligne 1 gauche : Première partie du nom de l'entreprise
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const leftText1a = "ETABLISSEMENT KADER SAWADOGO";
      doc.text(leftText1a, margin, startY + 5);
      
      // Ligne 1 droite : BURKINA FASSO
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const rightText1a = "BURKINA FASSO";
      const rightText1aWidth = doc.getTextWidth(rightText1a);
      doc.text(rightText1a, pageWidth - margin - rightText1aWidth, startY + 5);
      
      // Ligne 2 gauche : Deuxième partie du nom de l'entreprise
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const leftText1b = "ET FRERE";
      doc.text(leftText1b, margin, startY + 11);
      
      // Ligne 2 droite : LA PATRIE OU LA MORT
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const rightText1b = "LA PATRIE OU LA MORT";
      const rightText1bWidth = doc.getTextWidth(rightText1b);
      doc.text(rightText1b, pageWidth - margin - rightText1bWidth, startY + 11);
      
      // Ligne 3 droite : NOUS VAINCRONS
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const rightText1c = "NOUS VAINCRONS";
      const rightText1cWidth = doc.getTextWidth(rightText1c);
      doc.text(rightText1c, pageWidth - margin - rightText1cWidth, startY + 17);
      
      // Ligne 4 gauche : Tel BF (espacé du nom de l'entreprise)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const telTextBF = "Tel BF    : +226 75 58 57 76 | 76 54 71 71";
      doc.text(telTextBF, margin, startY + 15);
      
      // Ligne 5 gauche : Tel Mali (collé au Tel BF)
      const telTextMali = "Tel Mali : +223 73 73 73 44 | 74 52 11 47";
      doc.text(telTextMali, margin, startY + 21);
      
      // Ligne de séparation
      const separatorY = startY + 27;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, separatorY, pageWidth - margin, separatorY);
      
      // Titre du document
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const titleY = separatorY + 8;
      doc.text("REÇU D'ACHAT", pageWidth / 2, titleY, { align: "center" });
      
      // Informations du reçu
      let infoY = titleY + 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      // Client (en premier)
      doc.setFont("helvetica", "bold");
      doc.text("Client:", margin, infoY);
      doc.setFont("helvetica", "normal");
      const clientName = getClientName(entree);
      // Limiter la longueur du nom du client pour éviter le débordement
      const maxClientNameWidth = pageWidth - margin - 50;
      let displayClientName = clientName;
      if (doc.getTextWidth(clientName) > maxClientNameWidth) {
        while (doc.getTextWidth(displayClientName + "...") > maxClientNameWidth && displayClientName.length > 0) {
          displayClientName = displayClientName.slice(0, -1);
        }
        displayClientName += "...";
      }
      doc.text(displayClientName, margin + 30, infoY);
      
      // Numéro de reçu
      infoY += 6;
      doc.setFont("helvetica", "bold");
      doc.text("N° Reçu:", margin, infoY);
      doc.setFont("helvetica", "normal");
      doc.text(entree.numero_entree || "-", margin + 35, infoY);
      
      // Date
      doc.setFont("helvetica", "bold");
      doc.text("Date:", margin + 100, infoY);
      doc.setFont("helvetica", "normal");
      doc.text(formatDateDisplay(entree.date), margin + 120, infoY);
      
      // Ligne de séparation avant le tableau
      infoY += 6;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, infoY, pageWidth - margin, infoY);
      
      // Préparer les données du tableau de manière cohérente
      const tableData = (entree.achats || []).map((achat) => {
        // Normaliser les données pour éviter les problèmes de formatage
        const produitNom = String((achat as any).produit_nom || achat.nom_produit || "-").trim();
        const gros = Number((achat as any).gros) || 0;
        const unit = Number((achat as any).unit) || 0;
        const quantiteKg = Number(achat.quantite_kg) || 0;
        const prixUnitaire = Number(achat.prix_unitaire) || 0;
        const montant = Number((achat as any).somme_totale || achat.montant || 0);
        
        return [
          produitNom,
          formatNumber(gros),
          formatNumber(unit),
          formatNumber(quantiteKg),
          formatNumber(prixUnitaire),
          formatNumber(montant) + " F"
        ];
      });
      
      // Calculer les largeurs de colonnes proportionnelles pour un meilleur ajustement
      const tableWidth = pageWidth - (2 * margin);
      // Largeurs ajustées pour occuper plus d'espace : Produit (18%), Nbr sac (14%), Poids sac (14%), Tonnage (16%), Prix (19%), Montant (19%)
      const colWidths = [
        tableWidth * 0.18,  // Produit (augmenté)
        tableWidth * 0.14,  // Nbr sac
        tableWidth * 0.14,  // Poids sac
        tableWidth * 0.16,  // Tonnage
        tableWidth * 0.19,  // Prix d'achat
        tableWidth * 0.19,  // Montant
      ];
      
      // Générer le tableau avec des paramètres fixes pour garantir la cohérence
      autoTable(doc, {
        startY: infoY + 4,
        head: [["Produit", "Nbr sac", "Poids sac", "Tonnage", "Prix d'achat", "Montant"]],
        body: tableData,
        theme: "grid",
        headStyles: { 
          fillColor: [66, 139, 202], 
          textColor: 255, 
          fontStyle: "bold", 
          fontSize: 14,
          halign: 'center',
          cellPadding: 6,
          lineWidth: 0.5,
        },
        bodyStyles: {
          fontSize: 13,
          cellPadding: 6,
          textColor: [0, 0, 0], // Noir pur pour meilleure visibilité
          lineWidth: 0.3,
        },
        styles: { 
          fontSize: 13, 
          cellPadding: 6,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          textColor: [0, 0, 0], // Noir pur pour meilleure visibilité
          lineWidth: 0.3,
        },
        columnStyles: {
          0: { cellWidth: colWidths[0], halign: 'left', valign: 'middle', fontSize: 13, textColor: [0, 0, 0] },
          1: { cellWidth: colWidths[1], halign: 'right', valign: 'middle', fontSize: 13, textColor: [0, 0, 0] },
          2: { cellWidth: colWidths[2], halign: 'right', valign: 'middle', fontSize: 13, textColor: [0, 0, 0] },
          3: { cellWidth: colWidths[3], halign: 'right', valign: 'middle', fontSize: 13, textColor: [0, 0, 0] },
          4: { cellWidth: colWidths[4], halign: 'right', valign: 'middle', fontSize: 13, textColor: [0, 0, 0] },
          5: { cellWidth: colWidths[5], halign: 'right', valign: 'middle', fontSize: 13, textColor: [0, 0, 0] },
        },
        margin: { left: margin, right: margin, top: infoY + 4 },
        tableWidth: tableWidth,
        showHead: 'everyPage',
        showFoot: 'never',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });
      
      // Récupérer la position Y finale du tableau
      const finalY = ((doc as any).lastAutoTable?.finalY || infoY + 50);
      
      // Calculer les valeurs de manière cohérente
      const charge = Number((entree as any).autres_charges || entree.charge || 0);
      const restant = Number((entree as any).restant || 0);
      const avance = Number((entree as any).avance || 0);
      const montantNet = Number(entree.montant_net || 0);
      const montantHt = Number(entree.montant_ht || 0);
      const paye = Number((entree as any).paye || 0);
      const nonPaye = montantNet - paye;
      
      // Créer les lignes de totaux avec labels et valeurs séparés pour un meilleur contrôle
      // Ligne 1 : Charge, Restant, Avance, Total, (vide), Total Net
      const totalsRow1 = [
        `Charge: ${formatNumber(charge)} F`,
        `Ancien Reste: ${formatNumber(restant)} F`,
        `Avance: ${formatNumber(avance)} F`,
        `Total : ${formatNumber(montantHt)} F`,
        "",
        `Total Net : ${formatNumber(montantNet)} F`
      ];
      
      // Ligne 2 : (vide), (vide), (vide), (vide), Payé, Non payé
      // Vérifier s'il y a un montant non payé pour le mettre en rouge
      const hasNonPaye = nonPaye > 0;
      const totalsRow2 = [
        "",
        "",
        "",
        "",
        `Payé: ${formatNumber(paye)} F`,
        `Non payé : ${formatNumber(nonPaye)} F`
      ];
      
      // Utiliser autoTable pour les totaux avec les MÊMES largeurs de colonnes pour garantir l'alignement
      autoTable(doc, {
        startY: finalY, // Collé directement au tableau des produits
        body: [totalsRow1, totalsRow2],
        theme: "grid",
        bodyStyles: {
          fontSize: 11,
          cellPadding: 4,
          fillColor: [245, 245, 245], // Fond gris clair
          minCellHeight: 8,
          textColor: [0, 0, 0], // Noir pur pour meilleure visibilité
        },
        styles: { 
          fontSize: 11, 
          cellPadding: 4,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          fillColor: [245, 245, 245],
          minCellHeight: 8,
          textColor: [0, 0, 0], // Noir pur pour meilleure visibilité
        },
        columnStyles: {
          0: { cellWidth: colWidths[0], halign: 'left', valign: 'middle', fontStyle: 'normal', fontSize: 11, minCellHeight: 8, textColor: [0, 0, 0] },
          1: { cellWidth: colWidths[1], halign: 'left', valign: 'middle', fontStyle: 'normal', fontSize: 11, minCellHeight: 8, textColor: [0, 0, 0] },
          2: { cellWidth: colWidths[2], halign: 'left', valign: 'middle', fontStyle: 'normal', fontSize: 11, minCellHeight: 8, textColor: [0, 0, 0] },
          3: { cellWidth: colWidths[3], halign: 'left', valign: 'middle', fontStyle: 'bold', fontSize: 12, minCellHeight: 8, textColor: [0, 0, 0] },
          4: { cellWidth: colWidths[4], halign: 'left', valign: 'middle', fontStyle: 'normal', fontSize: 11, minCellHeight: 8, textColor: [0, 0, 0] },
          5: { cellWidth: colWidths[5], halign: 'left', valign: 'middle', fontStyle: 'bold', fontSize: 12, minCellHeight: 8, textColor: [0, 0, 0] },
        },
        margin: { left: margin, right: margin },
        tableWidth: tableWidth,
        showHead: 'never',
        showFoot: 'never',
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        didParseCell: (data: any) => {
          // Appliquer les styles spécifiques pour chaque cellule
          if (data.row.index === 0) {
            // Première ligne - fond gris pour toutes les cellules
            data.cell.styles.fillColor = [245, 245, 245];
            data.cell.styles.fontSize = 11; // Taille augmentée pour meilleure lisibilité
            data.cell.styles.minCellHeight = 8;
            data.cell.styles.textColor = [0, 0, 0]; // Noir pur
            if (data.column.index === 3) {
              // Total
              data.cell.styles.fontStyle = 'bold';
            } else if (data.column.index === 5) {
              // Total Net
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.fontStyle = 'normal';
            }
          } else if (data.row.index === 1) {
            // Deuxième ligne - fond gris pour toutes les cellules
            data.cell.styles.fillColor = [245, 245, 245];
            data.cell.styles.fontSize = 11; // Taille augmentée pour meilleure lisibilité
            data.cell.styles.minCellHeight = 8;
            if (data.column.index === 5) {
              // Non payé - mettre en rouge si montant > 0
              data.cell.styles.fontStyle = 'bold';
              if (hasNonPaye) {
                data.cell.styles.textColor = [255, 0, 0]; // Rouge
              } else {
                data.cell.styles.textColor = [0, 0, 0]; // Noir
              }
            } else {
              data.cell.styles.fontStyle = 'normal';
              data.cell.styles.textColor = [0, 0, 0]; // Noir pur
            }
          }
        },
      });
      
      // Récupérer la position Y finale après les totaux
      const totalsFinalY = ((doc as any).lastAutoTable?.finalY || finalY + 20);
      
      // Pied de page - s'assurer qu'il est toujours visible
      const footerY = pageHeight - 20;
      doc.setFontSize(11); // Augmentation de la taille de police de la date
      doc.setFont("helvetica", "normal");
      const today = new Date().toLocaleDateString('fr-FR');
      const leftFooter = `Bobo Dioulasso le ${today}`;
      doc.text(leftFooter, margin, footerY);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13); // Augmentation de la taille de police
      const rightFooter = "SIGNATURE DU PDG DE KSS";
      const rightFooterWidth = doc.getTextWidth(rightFooter);
      doc.text(rightFooter, pageWidth - margin - rightFooterWidth, footerY);
      
      // Nom du fichier
      const fileName = `Recu_Achat_${entree.numero_entree || "N-A"}_${formatDateDisplay(entree.date).replace(/\//g, "-")}.pdf`;
      
      // Sauvegarder le PDF avec le nom de fichier
      doc.save(fileName);
      
      toast({
        title: "Succès !",
        description: "PDF généré et téléchargé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la génération du PDF",
        variant: "destructive",
      });
    }
  };

  const MOIS_FRANCAIS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  // Fonction pour formater la date au format "jj/mm/aaaa"
  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const formatNumber = (value: number | string): string => {
    const valueStr = String(value);
    const parts = valueStr.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    if (parts.length === 1 || !parts[1] || parts[1].match(/^0+$/)) {
      return integerPart;
    }
    
    const decimalPart = parts[1].replace(/0+$/, '');
    return decimalPart ? integerPart + ',' + decimalPart : integerPart;
  };

  const getClientName = (entree: EntreeAchat): string => {
    // Utiliser client_nom du serializer si disponible
    if ((entree as any).client_nom) {
      return (entree as any).client_nom;
    }
    if (entree.client) {
      const client = clients.find(c => c.id === entree.client);
      return client ? client.full_name : "";
    }
    return entree.nom_client || "";
  };

  return (
    <DashboardLayout>
      <datalist id="produits-list">
        {produits.map((produit) => (
          <option key={produit.id} value={produit.name}>
            {produit.name}
          </option>
        ))}
      </datalist>
      <PageHeader
        title="Achats"
        icon={ShoppingCart}
      />

      {/* Formulaire d'entrée (affiché directement) */}
      <div className="bg-card rounded-xl border border-border p-4 mt-4 mb-6">
        <div className="grid gap-4">
          {/* En-tête */}
          <div className="grid grid-cols-2 gap-4 mb-2">
            <Input
              type="text"
              value={newEntree.nom_client || ""}
              onChange={(e) => setNewEntree({ ...newEntree, nom_client: e.target.value })}
              placeholder="Nom du client"
              disabled={isSaving}
              className="text-lg font-medium"
            />
            <Input
              type="date"
              value={newEntree.date || ""}
              onChange={(e) => setNewEntree({ ...newEntree, date: e.target.value })}
              disabled={isSaving}
              className="text-lg font-medium"
            />
          </div>

          {/* Tableau des produits */}
          <div className="border border-solid border-border rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-30">
                <tr className="bg-muted">
                  <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[200px] bg-muted">Produit</th>
                  <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[80px] bg-muted">Nbr sac</th>
                  <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[90px] bg-muted">Poids sac</th>
                  <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[120px] bg-muted">Tonnage</th>
                  <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[130px] bg-muted">Prix d'achat</th>
                  <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[150px] bg-muted">Montant</th>
                  <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-center font-semibold text-xl text-card-foreground w-12 bg-muted">#</th>
                </tr>
              </thead>
              <tbody>
                {newEntree.achats && newEntree.achats.length > 0 ? (
                  newEntree.achats.map((ligne, index) => (
                    <tr key={index} className="border-t border-gray-400 dark:border-gray-600 hover:bg-muted/20 transition-colors">
                      <td className="border-r border-gray-400 dark:border-gray-600 p-0 min-w-[200px]">
                        <Input
                          type="text"
                          list="produits-list"
                          autoComplete="off"
                          value={ligne.nom_produit || ""}
                          onChange={(e) => handleUpdateLigne(index, "nom_produit", e.target.value)}
                          placeholder="Nom du produit"
                          className="h-9 border-0 rounded-none bg-transparent focus:bg-accent/10 text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 p-0 min-w-[80px]">
                        <Input
                          type="number"
                          value={ligne.gros === 0 ? "" : ligne.gros}
                          onChange={(e) => handleUpdateLigne(index, "gros", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                          className="h-9 border-0 rounded-none bg-transparent focus:bg-accent/10 text-right text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 p-0 min-w-[90px]">
                        <Input
                          type="number"
                          value={ligne.unit === 0 ? "" : ligne.unit}
                          onChange={(e) => handleUpdateLigne(index, "unit", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                          className="h-9 border-0 rounded-none bg-transparent focus:bg-accent/10 text-right text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-3 py-1 text-right font-medium text-xl text-foreground min-w-[120px]">
                        {formatNumber(ligne.quantite_kg || 0)}
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 p-0 min-w-[130px]">
                        <Input
                          type="number"
                          value={ligne.prix_unitaire === 0 ? "" : ligne.prix_unitaire}
                          onChange={(e) => handleUpdateLigne(index, "prix_unitaire", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                          className="h-9 border-0 rounded-none bg-transparent focus:bg-accent/10 text-right text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          step="0.01"
                          min="0"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-3 py-1 text-right font-medium text-xl text-foreground min-w-[150px] bg-muted/20">
                        {formatNumber(ligne.montant || 0)} F
                      </td>
                      <td className="px-1 py-1 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLigne(index)}
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Supprimer cette ligne"
                          disabled={isSaving}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="border-t border-gray-400 dark:border-gray-600 px-3 py-8 text-center text-muted-foreground text-xl">
                      Cliquez sur "Ajouter un produit" pour commencer
                    </td>
                  </tr>
                )}
                {newEntree.achats && newEntree.achats.length > 0 && (
                  <>
                    <tr className="border-t-2 border-gray-500 dark:border-gray-500 bg-muted/50">
                      <td className="px-3 py-2 text-right">
                        <span className="text-lg font-medium">Charge: </span>
                        <Input
                          type="number"
                          value={newEntree.charge === 0 ? "" : newEntree.charge}
                          onChange={(e) => setNewEntree({ ...newEntree, charge: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                          step="0.01"
                          min="0"
                          className="inline-block w-28 h-9 border border-border rounded px-2 text-right font-bold text-lg mx-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          disabled={isSaving}
                        />
                        <span className="text-lg font-medium"> F</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-lg font-medium">Ancien Reste: </span>
                        <Input
                          type="number"
                          value={newEntree.restant === 0 ? "" : newEntree.restant}
                          onChange={(e) => setNewEntree({ ...newEntree, restant: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                          step="0.01"
                          min="0"
                          className="inline-block w-28 h-9 border border-border rounded px-2 text-right font-bold text-lg mx-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          disabled={isSaving}
                        />
                        <span className="text-lg font-medium"> F</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-lg font-medium">Avance: </span>
                        <Input
                          type="number"
                          value={newEntree.avance === 0 ? "" : newEntree.avance}
                          onChange={(e) => setNewEntree({ ...newEntree, avance: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                          step="0.01"
                          min="0"
                          className="inline-block w-28 h-9 border border-border rounded px-2 text-right font-bold text-lg mx-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          disabled={isSaving}
                        />
                        <span className="text-lg font-medium"> F</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-bold text-lg text-foreground">
                          Total : {formatNumber(calculateTotal())} F
                        </span>
                      </td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right text-xl font-extrabold whitespace-nowrap text-black dark:text-white bg-muted/20">
                        Total Net : {formatNumber(calculateTotalNet())} F
                      </td>
                    </tr>
                    <tr className="border-t border-gray-400 dark:border-gray-600 bg-muted/50">
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-lg font-bold">Payé: </span>
                        <Input
                          type="number"
                          value={newEntree.paye === 0 ? "" : newEntree.paye}
                          onChange={(e) => setNewEntree({ ...newEntree, paye: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                          step="0.01"
                          min="0"
                          className="inline-block w-32 h-9 border border-border rounded px-2 text-right font-bold text-lg mx-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          disabled={isSaving}
                        />
                        <span className="text-lg font-medium"> F</span>
                      </td>
                      <td className="px-3 py-2 text-right bg-muted/20">
                        <span className="font-bold text-lg text-foreground">
                          Non payé : {formatNumber(calculateSommeRestante())} F
                        </span>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button
              onClick={handleAddLigne}
              disabled={isSaving}
              size="icon"
              className="h-14 w-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              <Plus size={24} />
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isSaving}
              >
                Annuler
              </Button>
              <Button onClick={handleAddEntree} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Valider
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des entrées (ex2) */}
      <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {entrees.length === 0 ? (
              <div className="px-3 py-8 text-center text-muted-foreground">
                Aucune entrée d'achat enregistrée. Cliquez sur "Nouvelle entrée" pour ajouter une entrée.
              </div>
            ) : (
              <div className="space-y-8 p-4">
                {entrees.map((entree) => (
                  <div
                    key={entree.id}
                    className="border-2 border-solid border-border rounded-xl overflow-hidden shadow-md bg-background/80 hover:shadow-lg transition-shadow mb-6"
                  >
                    {/* En-tête de l'entrée */}
                    {(() => {
                      const nonPaye = (entree.montant_net || 0) - ((entree as any).paye || 0);
                      const hasNonPaye = nonPaye > 0;
                      return (
                        <div className={`px-4 py-3 border-b-2 border-solid ${hasNonPaye ? 'border-red-600 dark:border-red-400 bg-red-100 dark:bg-red-900/30' : 'border-border bg-muted/30'} flex items-center justify-between`}>
                          <div className={`font-bold text-base ${hasNonPaye ? 'text-red-700 dark:text-red-300' : ''}`}>
                            Nom du client : {getClientName(entree)}
                          </div>
                          <div className="flex items-center gap-6">
                            <div className={`text-base font-bold ${hasNonPaye ? 'text-red-700 dark:text-red-300' : ''}`}>
                              {entree.numero_entree && (
                                <span>
                                  N° reçu : {entree.numero_entree}
                                </span>
                              )}
                            </div>
                            <div className={`text-base font-bold ${hasNonPaye ? 'text-red-700 dark:text-red-300' : ''}`}>
                              {entree.date && (
                                <span>
                                  Date : {formatDateDisplay(entree.date)}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generatePDF(entree)}
                              className="gap-2"
                            >
                              <Download size={16} />
                              PDF
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tableau des produits (même structure que le formulaire) */}
                    <div className="p-2">
                      <table className="w-full border-collapse">
                      <thead className="sticky top-0 z-30">
                        <tr className="bg-muted">
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[200px] bg-muted">Produit</th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[80px] bg-muted">Nbr sac</th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[90px] bg-muted">Poids sac</th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[120px] bg-muted">Tonnage</th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[130px] bg-muted">Prix d'achat</th>
                          <th className="px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[150px] bg-muted">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entree.achats && entree.achats.length > 0 ? (
                          entree.achats.map((achat, index) => (
                            <tr key={achat.id || index} className="border-t border-gray-400 dark:border-gray-600 hover:bg-muted/20 transition-colors">
                              <td className="border-r border-gray-400 dark:border-gray-600 px-3 py-1 min-w-[200px]">
                                <span className="font-medium text-xl text-foreground">
                                  {(achat as any).produit_nom || achat.nom_produit || "-"}
                                </span>
                              </td>
                              <td className="border-r border-gray-400 dark:border-gray-600 px-3 py-1 text-right min-w-[80px]">
                                <span className="font-medium text-xl text-foreground">
                                  {formatNumber((achat as any).gros || 0)}
                                </span>
                              </td>
                              <td className="border-r border-gray-400 dark:border-gray-600 px-3 py-1 text-right min-w-[90px]">
                                <span className="font-medium text-xl text-foreground">
                                  {formatNumber((achat as any).unit || 0)}
                                </span>
                              </td>
                              <td className="border-r border-gray-400 dark:border-gray-600 px-3 py-1 text-right min-w-[120px]">
                                <span className="font-medium text-xl text-foreground">
                                  {formatNumber(achat.quantite_kg || 0)}
                                </span>
                              </td>
                              <td className="border-r border-gray-400 dark:border-gray-600 px-3 py-1 text-right min-w-[130px]">
                                <span className="font-medium text-xl text-foreground">
                                  {formatNumber(achat.prix_unitaire || 0)}
                                </span>
                              </td>
                              <td className="px-3 py-1 text-right min-w-[150px] bg-muted/20">
                                <span className="font-medium text-xl text-foreground">
                                  {formatNumber((achat as any).somme_totale || achat.montant || 0)} F
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="border-t border-gray-400 dark:border-gray-600 px-3 py-4 text-center text-muted-foreground text-xl">
                              Aucun produit
                            </td>
                          </tr>
                        )}
                        {entree.achats && entree.achats.length > 0 && (
                          <>
                            <tr className="border-t-2 border-gray-500 dark:border-gray-500 bg-muted/50">
                              <td className="px-3 py-2 text-right">
                                <span className="text-lg font-medium">Charge: {formatNumber((entree as any).autres_charges || entree.charge || 0)} F</span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className="text-lg font-medium">Ancien Reste: {formatNumber((entree as any).restant || 0)} F</span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className="text-lg font-medium">Avance: {formatNumber((entree as any).avance || 0)} F</span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className="font-bold uppercase text-lg text-foreground">
                                  Total : {formatNumber(entree.montant_ht || 0)} F
                                </span>
                              </td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2 text-right text-xl font-extrabold whitespace-nowrap text-black dark:text-white bg-muted/20">
                                Total Net : {formatNumber(entree.montant_net || 0)} F
                              </td>
                            </tr>
                            <tr className="border-t border-gray-400 dark:border-gray-600 bg-muted/50">
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2"></td>
                              <td className="px-3 py-2 text-right">
                                <span className="text-lg font-medium">Payé: {formatNumber((entree as any).paye || 0)} F</span>
                              </td>
                              <td className="px-3 py-2 text-right bg-muted/20">
                                <span className="font-bold text-lg text-foreground">
                                  Non payé : {formatNumber((entree.montant_net || 0) - ((entree as any).paye || 0))} F
                                </span>
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
