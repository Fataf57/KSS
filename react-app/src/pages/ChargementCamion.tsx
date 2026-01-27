import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Truck, Plus, Trash2, Save, Loader2, Check, FileDown, Edit, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ChargementRow {
  id: number;
  date_chargement: string;
  ville_depart: string;
  ville_arrivee: string;
  ville: string; // Format: "Bobo--Ouaga"
  type_denree: string;
  nombre_sacs: number;
  poids_par_sac: number;
  tonnage_total: number;
  numero_camion: string;
  numero_chauffeur: string;
  date_arrivee: string;
  poids_arrive: number | null;
  poids_manquant: number | null;
  depenses: number;
  isSaved?: boolean;
  savedId?: number;
}
const STORAGE_KEY = "camion_chargement_rows";

const TYPES_DENREE_PREDEFINIS = ["Anacarde", "Karité", "Sesame", "Soza", "Mais"];

const MOIS_FRANCAIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

// Fonction pour obtenir le mois d'une date
const getMonthFromDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const month = date.getMonth();
  const year = date.getFullYear();
  return `${MOIS_FRANCAIS[month]}${year}`;
};

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

// Fonction pour convertir la date de l'API (aaaa-mm-jj) vers le format d'affichage (jj/mm/aaaa)
const convertDateToDisplay = (dateString: string): string => {
  if (!dateString) return "";
  // Si c'est au format aaaa-mm-jj, le convertir en jj/mm/aaaa
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }
  // Si c'est déjà au format jj/mm/aaaa, le retourner tel quel
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  // Sinon, essayer de parser avec Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // Ignorer les erreurs
  }
  return dateString;
};

// Fonction pour convertir la date de "jj/mm/aaaa" ou "aaaa-mm-jj" vers "aaaa-mm-jj"
const convertDateToAPI = (dateString: string): string => {
  if (!dateString) return "";
  // Si c'est déjà au format aaaa-mm-jj, le retourner tel quel
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  // Si c'est au format jj/mm/aaaa, le convertir
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }
  // Sinon, essayer de parser avec Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Ignorer les erreurs
  }
  return dateString;
};

// Fonction pour formater les nombres (comme dans Achats.tsx)
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

// Fonction pour formater le numéro de chauffeur (espace tous les 2 chiffres)
const formatChauffeur = (value: string): string => {
  if (!value) return "";
  const cleaned = value.replace(/\s/g, '');
  return cleaned.match(/.{1,2}/g)?.join(' ') || cleaned;
};

// Fonction pour formater les nombres avec espaces tous les 3 chiffres
const formatNumberWithSpaces = (value: number | string | null | undefined): string => {
  if (!value && value !== 0) return "";
  const valueStr = String(value);
  const parts = valueStr.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (parts.length > 1 && parts[1]) {
    // Supprimer .00 à la fin
    const decimalPart = parts[1].replace(/0+$/, '');
    if (decimalPart) {
      return integerPart + '.' + decimalPart;
    }
  }
  return integerPart;
};

// Fonction pour formater les dépenses (espace tous les 3 chiffres + F)
const formatDepenses = (value: number | string | null | undefined): string => {
  if (!value || value === 0) return "0 F";
  let formatted = formatNumberWithSpaces(value);
  // Supprimer .00 à la fin
  formatted = formatted.replace(/\.00$/, '');
  return formatted + " F";
};

export default function ChargementCamion() {
  const [rows, setRows] = useState<ChargementRow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const { toast } = useToast();

  // Charger l'historique depuis l'API
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(getApiUrl("camion-chargements/"));
      if (!response.ok) {
        throw new Error("Erreur lors du chargement de l'historique");
      }
      const data = await response.json();
      
      // Convertir les données de l'API en format ChargementRow
      const historyRows: ChargementRow[] = data.map((entry: any) => {
        const tonnageTotal = Number(entry.tonnage_total);
        const poidsArrive = entry.poids_arrive ? Number(entry.poids_arrive) : null;
        const poidsManquant = entry.poids_manquant !== null && entry.poids_manquant !== undefined 
          ? Number(entry.poids_manquant)
          : (poidsArrive !== null ? Math.max(0, tonnageTotal - poidsArrive) : null);
        
        const villeDepart = entry.ville_depart || "";
        const villeArrivee = entry.destination || "";
        const ville = villeDepart && villeArrivee ? `${villeDepart}--${villeArrivee}` : villeDepart || villeArrivee;
        
        return {
          id: -entry.id, // ID négatif pour l'historique
          date_chargement: entry.date_chargement,
          ville_depart: villeDepart,
          ville_arrivee: villeArrivee,
          ville: ville,
          type_denree: entry.type_denree,
          nombre_sacs: entry.nombre_sacs,
          poids_par_sac: Number(entry.poids_par_sac),
          tonnage_total: tonnageTotal,
          numero_camion: entry.numero_camion || "",
          numero_chauffeur: entry.numero_chauffeur || "",
          date_arrivee: entry.date_arrivee || "",
          poids_arrive: poidsArrive,
          poids_manquant: poidsManquant,
          depenses: entry.depenses || 0,
          isSaved: true,
          savedId: entry.id,
        };
      });

      // Trier les lignes sauvegardées par savedId pour préserver l'ordre d'insertion
      historyRows.sort((a, b) => {
        if (a.savedId && b.savedId) {
          return a.savedId - b.savedId;
        }
        if (a.savedId) return -1;
        if (b.savedId) return 1;
        return 0;
      });

      // Charger les lignes non Enregistrées depuis localStorage
      const savedRows = localStorage.getItem(STORAGE_KEY);
      let unsavedRows: ChargementRow[] = [];
      if (savedRows) {
        try {
          unsavedRows = JSON.parse(savedRows).filter((r: ChargementRow) => !r.isSaved);
          // Trier les lignes non sauvegardées par id pour préserver l'ordre d'insertion
          unsavedRows.sort((a, b) => a.id - b.id);
          const maxId = unsavedRows.length > 0 
            ? Math.max(...unsavedRows.map((r: ChargementRow) => r.id))
            : 0;
          setNextId(Math.max(maxId, 0) + 1);
        } catch (error) {
          console.error("Erreur lors du chargement des données:", error);
        }
      } else {
        setNextId(1);
      }

      setRows([...historyRows, ...unsavedRows]);
    } catch (error: any) {
      console.error("Erreur lors du chargement de l'historique:", error);
    const savedRows = localStorage.getItem(STORAGE_KEY);
    if (savedRows) {
      try {
        const parsedRows = JSON.parse(savedRows);
        setRows(parsedRows);
        const maxId = parsedRows.length > 0 
            ? Math.max(...parsedRows.map((r: ChargementRow) => r.id))
          : 0;
        setNextId(maxId + 1);
        } catch (e) {
          console.error("Erreur lors du chargement des données:", e);
        }
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Enregistrer dans localStorage seulement les lignes non Enregistrées
  useEffect(() => {
    const unsavedRows = rows.filter(r => !r.isSaved);
    if (unsavedRows.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unsavedRows));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [rows]);

  const [updatingRowId, setUpdatingRowId] = useState<number | null>(null);

  const updateCell = (id: number, field: keyof ChargementRow, value: string | number | null) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        
        // Si on met à jour le champ ville, parser pour séparer départ et arrivée
        if (field === "ville") {
          const villeValue = value as string || "";
          const parts = villeValue.split("--");
          if (parts.length >= 2) {
            updated.ville_depart = parts[0].trim();
            updated.ville_arrivee = parts[1].trim();
          } else if (parts.length === 1) {
            // Si pas de "--", considérer comme départ uniquement
            updated.ville_depart = parts[0].trim();
            updated.ville_arrivee = "";
          }
        }
        
        // Si on met à jour ville_depart ou ville_arrivee, mettre à jour ville
        if (field === "ville_depart" || field === "ville_arrivee") {
          const depart = field === "ville_depart" ? (value as string || "") : updated.ville_depart;
          const arrivee = field === "ville_arrivee" ? (value as string || "") : updated.ville_arrivee;
          if (depart && arrivee) {
            updated.ville = `${depart}--${arrivee}`;
          } else if (depart) {
            updated.ville = depart;
          } else if (arrivee) {
            updated.ville = arrivee;
          } else {
            updated.ville = "";
          }
        }
        
        // Calcul automatique du tonnage total
        if (field === "nombre_sacs" || field === "poids_par_sac") {
          updated.tonnage_total = Number(updated.nombre_sacs) * Number(updated.poids_par_sac);
        }
        // Calcul automatique du poids manquant
        if (field === "poids_arrive" || field === "tonnage_total") {
          if (updated.poids_arrive !== null && updated.poids_arrive !== undefined) {
            updated.poids_manquant = Math.max(0, updated.tonnage_total - Number(updated.poids_arrive));
          } else {
            updated.poids_manquant = null;
          }
        }
        return updated;
      }
      return row;
    }));
  };

  const addRow = () => {
    const newRow: ChargementRow = {
      id: nextId,
      date_chargement: new Date().toISOString().split('T')[0],
      ville_depart: "",
      ville_arrivee: "",
      ville: "",
      type_denree: "",
      nombre_sacs: 0,
      poids_par_sac: 0,
      tonnage_total: 0,
      numero_camion: "",
      numero_chauffeur: "",
      date_arrivee: "",
      poids_arrive: null,
      poids_manquant: null,
      depenses: 0,
      isSaved: false,
    };
    setRows([...rows, newRow]);
    setNextId(nextId + 1);
    
    // Faire défiler automatiquement vers la nouvelle ligne après un court délai
    setTimeout(() => {
      const tableContainer = document.querySelector('.overflow-auto');
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  };

  const deleteRow = async (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    // Si la ligne est enregistrée, supprimer via l'API
    if (row.isSaved && row.savedId) {
      try {
        const response = await fetch(getApiUrl(`camion-chargements/${row.savedId}/`), {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          let errorMessage = "Erreur lors de la suppression";
          try {
            const errorData = await response.json();
            if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else if (typeof errorData === 'object') {
              const errorMessages = Object.entries(errorData).map(([key, value]) => {
                if (Array.isArray(value)) {
                  return `${key}: ${value.join(", ")}`;
                }
                return `${key}: ${value}`;
              });
              errorMessage = errorMessages.join("\n");
            }
          } catch (e) {
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        toast({
          title: "Succès !",
          description: "Chargement supprimé avec succès",
        });

        window.dispatchEvent(new Event('stock-updated'));
        fetchHistory();
      } catch (error: any) {
        let errorMessage = "Une erreur est survenue lors de la suppression";
        if (error.message) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } else {
      // Si la ligne n'est pas enregistrée, supprimer du state
      setRows(prevRows => prevRows.filter(row => row.id !== id));
    }
  };

  const validateRow = (row: ChargementRow): string | null => {
    // Permettre l'enregistrement si la ligne est complètement vide
    const isRowEmpty = !row.date_chargement && !row.type_denree?.trim() && 
                       (!row.nombre_sacs || row.nombre_sacs <= 0) && 
                       (!row.poids_par_sac || row.poids_par_sac <= 0);
    if (isRowEmpty) return null;
    
    // Si au moins un champ est rempli, valider les champs requis
    if (!row.date_chargement) return "La date est requise";
    if (!row.type_denree.trim()) return "Le type de produits est requis";
    if (row.nombre_sacs <= 0) return "Le nombre de sacs doit être supérieur à 0";
    if (row.poids_par_sac <= 0) return "Le poids par sac doit être supérieur à 0";
    return null;
  };

  const handleUpdateRow = async (rowId: number) => {
    const row = rows.find(r => r.id === rowId);
    if (!row || !row.isSaved || !row.savedId) return;

    const error = validateRow(row);
    if (error) {
      toast({
        title: "Erreur de validation",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setUpdatingRowId(rowId);

    try {
      const payload = {
        date_chargement: convertDateToAPI(row.date_chargement),
        ville_depart: row.ville_depart || "",
        destination: row.ville_arrivee || "",
        type_denree: row.type_denree,
        nombre_sacs: row.nombre_sacs,
        poids_par_sac: row.poids_par_sac,
        numero_camion: row.numero_camion || "",
        numero_chauffeur: row.numero_chauffeur || "",
        date_arrivee: row.date_arrivee ? convertDateToAPI(row.date_arrivee) : null,
        poids_arrive: row.poids_arrive || null,
        depenses: row.depenses || 0,
      };

      const response = await fetch(getApiUrl(`camion-chargements/${row.savedId}/`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Erreur lors de la mise à jour";
        try {
          const errorData = await response.json();
          if (errorData.non_field_errors) {
            errorMessage = Array.isArray(errorData.non_field_errors) 
              ? errorData.non_field_errors.join(", ")
              : errorData.non_field_errors;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (typeof errorData === 'object') {
            const errorMessages = Object.entries(errorData).map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(", ")}`;
              }
              return `${key}: ${value}`;
            });
            errorMessage = errorMessages.join("\n");
          }
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Succès !",
        description: "Chargement mis à jour avec succès",
      });
      
      window.dispatchEvent(new Event('stock-updated'));
      fetchHistory();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setUpdatingRowId(null);
    }
  };

  const generatePDF = async (row: ChargementRow) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      
      // À gauche : ETABLISSEMENT KADER SAWADOGO ET FRERE avec téléphones
      // Tous les éléments sur la même ligne horizontale
      const startY = margin; // Position de départ
      
      // Logo au centre - même niveau que les textes
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
      doc.setTextColor(0, 0, 0); // Noir pur
      const leftText1a = "ETABLISSEMENT KADER SAWADOGO";
      doc.text(leftText1a, margin, startY + 5);
      
      // Ligne 1 droite : Première partie de BURKINA FASO
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0); // Noir pur
      const rightText1a = "BURKINA FASO, LA PATRIE";
      const rightText1aWidth = doc.getTextWidth(rightText1a);
      doc.text(rightText1a, pageWidth - margin - rightText1aWidth, startY + 5);
      
      // Ligne 2 gauche : Deuxième partie du nom de l'entreprise
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0); // Noir pur
      const leftText1b = "ET FRERE";
      doc.text(leftText1b, margin, startY + 11);
      
      // Ligne 2 droite : Deuxième partie de BURKINA FASO
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0); // Noir pur
      const rightText1b = "OU LA MORT NOUS VAINCRONS";
      const rightText1bWidth = doc.getTextWidth(rightText1b);
      doc.text(rightText1b, pageWidth - margin - rightText1bWidth, startY + 11);
      
      // Ligne 3 gauche : Les deux téléphones sur la même ligne
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0); // Noir pur
      const telText = "TEL: 75585776  TEL: 78926341";
      doc.text(telText, margin, startY + 17);
      
      // Ligne de séparation
      const separatorY = startY + 23; // Après toutes les informations de contact
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, separatorY, pageWidth - margin, separatorY);
      
      // Titre du document
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0); // Noir pur
      const titleY = separatorY + 8;
      doc.text("Document de Chargement", pageWidth / 2, titleY, { align: "center" });
      
      // Formater les valeurs comme dans le tableau de l'interface
      const formatDateForPDF = (dateString: string): string => {
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
      
      const formatValueForPDF = (value: number | null | undefined): string => {
        if (value === null || value === undefined || value === 0) return "";
        return formatNumber(value);
      };
      
      const villeDisplay = row.ville_depart && row.ville_arrivee 
        ? `${row.ville_depart} - ${row.ville_arrivee}`
        : row.ville_depart || row.ville_arrivee || "";
      
      const poidsManquantValue = row.poids_manquant !== null && row.poids_manquant !== undefined 
        ? row.poids_manquant
        : (row.poids_arrive !== null && row.poids_arrive !== undefined 
          ? Math.max(0, row.tonnage_total - Number(row.poids_arrive))
          : null);
      
      // Tableau vertical sans header, juste les données
      const tableData = [
        ["Date Chargement", formatDateForPDF(row.date_chargement)],
        ["Ville", villeDisplay],
        ["Produit", row.type_denree || ""],
        ["Nbr sac", row.nombre_sacs && row.nombre_sacs > 0 ? row.nombre_sacs.toString() : ""],
        ["Poids sac", row.poids_par_sac && row.poids_par_sac > 0 ? row.poids_par_sac.toString() : ""],
        ["Tonnage", row.tonnage_total && row.tonnage_total > 0 ? `${formatNumber(row.tonnage_total)} kg` : ""],
        ["N° camion", row.numero_camion || ""],
        ["N° chauffeur", formatChauffeur(row.numero_chauffeur || "") || ""],
        ["Poid arrivé", row.poids_arrive && row.poids_arrive > 0 ? `${formatNumber(row.poids_arrive)} kg` : ""],
        ["Poids manqué", poidsManquantValue !== null && poidsManquantValue !== undefined && poidsManquantValue > 0
          ? `${formatNumber(poidsManquantValue)} kg`
          : ""],
        ["Dépenses", row.depenses && row.depenses > 0 ? (() => {
          let formatted = formatNumberWithSpaces(row.depenses);
          formatted = formatted.replace(/\.00$/, '');
          return formatted + " F";
        })() : ""],
      ];
      
      autoTable(doc, {
        startY: titleY + 10,
        body: tableData,
        theme: "grid",
        styles: { 
          fontSize: 12, 
          cellPadding: 6, 
          lineColor: [0, 0, 0], 
          lineWidth: 0.5,
          textColor: [0, 0, 0],
          font: 'helvetica',
          fontStyle: 'normal'
        },
        columnStyles: {
          0: { 
            cellWidth: 70, 
            halign: 'left', 
            fontStyle: 'bold', 
            cellPadding: 6,
            textColor: [0, 0, 0],
            font: 'helvetica'
          },  // Noms des colonnes
          1: { 
            halign: 'left', 
            cellPadding: 6,
            textColor: [0, 0, 0],
            font: 'helvetica',
            fontStyle: 'bold'
          },                                    // Valeurs
        },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        didDrawPage: () => {
          // Ajouter le pied de page après chaque page
          const footerY = pageHeight - 20;
          
          // À gauche : Bobo Dioulasso le [date]
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0); // Noir pur
          const today = new Date().toLocaleDateString('fr-FR');
          const leftFooter = `Bobo Dioulasso le ${today}`;
          doc.text(leftFooter, margin, footerY);
          
          // À droite : SIGNATURE PDG KADER
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0); // Noir pur
          const rightFooter = "SIGNATURE PDG KADER";
          const rightFooterWidth = doc.getTextWidth(rightFooter);
          doc.text(rightFooter, pageWidth - margin - rightFooterWidth, footerY);
        },
      });
      
      // Nom du fichier
      const fileName = `Chargement_Camion_${row.date_chargement || "N-A"}_${row.numero_camion || "N-A"}.pdf`;

      // Télécharger le PDF directement
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

  const handleSaveRow = async (rowId: number) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    const error = validateRow(row);
    if (error) {
      toast({
        title: "Erreur de validation",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setSavingRowId(rowId);

    try {
      const payload = {
        date_chargement: row.date_chargement,
        ville_depart: row.ville_depart || "",
        destination: row.ville_arrivee || "",
        type_denree: row.type_denree,
        nombre_sacs: row.nombre_sacs,
        poids_par_sac: row.poids_par_sac,
        numero_camion: row.numero_camion || "",
        numero_chauffeur: row.numero_chauffeur || "",
        date_arrivee: row.date_arrivee || null,
        poids_arrive: row.poids_arrive || null,
        numero_magasin: "1",
        stock_items: [],
      };

      const response = await fetch(getApiUrl("camion-chargements/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Erreur lors de la Enregistrement";
        try {
        const errorData = await response.json();
          if (errorData.non_field_errors) {
            errorMessage = Array.isArray(errorData.non_field_errors) 
              ? errorData.non_field_errors.join(", ")
              : errorData.non_field_errors;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (typeof errorData === 'object') {
            const errorMessages = Object.entries(errorData).map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(", ")}`;
              }
              return `${key}: ${value}`;
            });
            errorMessage = errorMessages.join("\n");
          }
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const savedData = await response.json();
      
      // Mettre à jour la ligne en place au lieu de la supprimer et recharger
      // Cela préserve l'ordre d'insertion
      setRows(prevRows => prevRows.map(r => {
        if (r.id === rowId) {
          return {
            ...r,
            id: -savedData.id, // ID négatif pour l'historique
            isSaved: true,
            savedId: savedData.id,
          };
        }
        return r;
      }));
      
      toast({
        title: "Succès !",
        description: "Ligne enregistrée avec succès",
      });
      
      window.dispatchEvent(new Event('stock-updated'));
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la Enregistrement",
        variant: "destructive",
      });
    } finally {
      setSavingRowId(null);
    }
  };

  const handleSave = async () => {
    const errors: string[] = [];
    rows.forEach((row, index) => {
      const error = validateRow(row);
      if (error) {
        errors.push(`Ligne ${index + 1}: ${error}`);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "Erreur de validation",
        description: errors.join("\n"),
        variant: "destructive",
      });
      return;
    }

    if (rows.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Veuillez ajouter au moins une ligne de chargement",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Enregistrer les nouvelles lignes (non enregistrées)
      const savePromises = rows.filter(r => !r.isSaved).map(async (row) => {
        const payload = {
          date_chargement: convertDateToAPI(row.date_chargement),
          ville_depart: row.ville_depart || "",
          destination: row.ville_arrivee || "",
          type_denree: row.type_denree,
          nombre_sacs: row.nombre_sacs,
          poids_par_sac: row.poids_par_sac,
          numero_camion: row.numero_camion || "",
          numero_chauffeur: row.numero_chauffeur || "",
          date_arrivee: row.date_arrivee ? convertDateToAPI(row.date_arrivee) : null,
          poids_arrive: row.poids_arrive || null,
          depenses: row.depenses || 0,
          numero_magasin: "1",
          stock_items: [],
        };

        const response = await fetch(getApiUrl("camion-chargements/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorMessage = "Erreur lors de la Enregistrement";
          try {
          const errorData = await response.json();
            if (errorData.non_field_errors) {
              errorMessage = Array.isArray(errorData.non_field_errors) 
                ? errorData.non_field_errors.join(", ")
                : errorData.non_field_errors;
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (typeof errorData === 'object') {
              const errorMessages = Object.entries(errorData).map(([key, value]) => {
                if (Array.isArray(value)) {
                  return `${key}: ${value.join(", ")}`;
                }
                return `${key}: ${value}`;
              });
              errorMessage = errorMessages.join("\n");
            }
          } catch (e) {
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        return response.json();
      });

      // Mettre à jour les lignes enregistrées modifiées
      const updatePromises = rows.filter(r => r.isSaved && r.savedId).map(async (row) => {
        const payload = {
          date_chargement: convertDateToAPI(row.date_chargement),
          ville_depart: row.ville_depart || "",
          destination: row.ville_arrivee || "",
          type_denree: row.type_denree,
          nombre_sacs: row.nombre_sacs,
          poids_par_sac: row.poids_par_sac,
          numero_camion: row.numero_camion || "",
          numero_chauffeur: row.numero_chauffeur || "",
          date_arrivee: row.date_arrivee ? convertDateToAPI(row.date_arrivee) : null,
          poids_arrive: row.poids_arrive || null,
          depenses: row.depenses || 0,
        };

        const response = await fetch(getApiUrl(`camion-chargements/${row.savedId}/`), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorMessage = "Erreur lors de la mise à jour";
          try {
            const errorData = await response.json();
            if (errorData.non_field_errors) {
              errorMessage = Array.isArray(errorData.non_field_errors) 
                ? errorData.non_field_errors.join(", ")
                : errorData.non_field_errors;
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (typeof errorData === 'object') {
              const errorMessages = Object.entries(errorData).map(([key, value]) => {
                if (Array.isArray(value)) {
                  return `${key}: ${value.join(", ")}`;
                }
                return `${key}: ${value}`;
              });
              errorMessage = errorMessages.join("\n");
            }
          } catch (e) {
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        return response.json();
      });

      const [savedResults, updatedResults] = await Promise.all([
        Promise.all(savePromises),
        Promise.all(updatePromises)
      ]);

      // Créer un mapping entre les IDs locaux et les IDs retournés par l'API pour les nouvelles lignes
      const rowsToSave = rows.filter(r => !r.isSaved);
      const idMapping = new Map<number, number>();
      rowsToSave.forEach((row, index) => {
        if (savedResults[index] && savedResults[index].id) {
          idMapping.set(row.id, savedResults[index].id);
        }
      });

      // Mettre à jour les lignes en place pour préserver l'ordre d'insertion
      setRows(prevRows => prevRows.map(r => {
        const newSavedId = idMapping.get(r.id);
        if (newSavedId !== undefined) {
          // Cette ligne vient d'être sauvegardée
          return {
            ...r,
            id: -newSavedId, // ID négatif pour l'historique
            isSaved: true,
            savedId: newSavedId,
          };
        }
        return r;
      }));

      const messages = [];
      if (rowsToSave.length > 0) {
        messages.push(`${rowsToSave.length} nouveau(x) chargement(s) enregistré(s)`);
      }
      const updatedCount = rows.filter(r => r.isSaved && r.savedId).length;
      if (updatedCount > 0) {
        messages.push(`${updatedCount} chargement(s) mis à jour`);
      }

      toast({
        title: "Succès !",
        description: messages.join(" et "),
      });

      window.dispatchEvent(new Event('stock-updated'));
      
      const newRow: ChargementRow = {
        id: nextId,
        date_chargement: new Date().toISOString().split('T')[0],
        ville_depart: "",
        ville_arrivee: "",
        ville: "",
        type_denree: "",
        nombre_sacs: 0,
        poids_par_sac: 0,
        tonnage_total: 0,
        numero_camion: "",
        numero_chauffeur: "",
        date_arrivee: "",
        poids_arrive: null,
        poids_manquant: null,
        depenses: 0,
        isSaved: false,
      };
      setRows(prevRows => [...prevRows, newRow]);
      setNextId(nextId + 1);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la Enregistrement",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Organiser les lignes en préservant l'ordre d'insertion (tri par savedId ou id)
  const organizeRowsByMonth = () => {
    // Trier par ordre d'insertion : d'abord par savedId (pour les lignes sauvegardées), puis par id (pour les non sauvegardées)
    const sortedRows = [...rows].sort((a, b) => {
      // Si les deux lignes sont sauvegardées, trier par savedId
      if (a.isSaved && a.savedId && b.isSaved && b.savedId) {
        return a.savedId - b.savedId;
      }
      // Si une seule est sauvegardée, la sauvegardée vient en premier
      if (a.isSaved && a.savedId) return -1;
      if (b.isSaved && b.savedId) return 1;
      // Si aucune n'est sauvegardée, trier par id
      return a.id - b.id;
    });
    
    const organized: Array<{ row: ChargementRow, month?: string, showMonth?: boolean }> = [];
    let currentMonth = "";
    
    sortedRows.forEach((row) => {
      const rowMonth = row.date_chargement ? getMonthFromDate(row.date_chargement) : "";
      const showMonth = rowMonth && rowMonth !== currentMonth;
      
      if (showMonth) {
        currentMonth = rowMonth;
      }
      
      organized.push({ row, month: rowMonth, showMonth });
    });
    
    return organized;
  };

  const organizedRows = organizeRowsByMonth();

  return (
    <DashboardLayout>
      <datalist id="types-denree">
        {TYPES_DENREE_PREDEFINIS.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 mb-4">
          <PageHeader
            title="Chargement Camion"
            description=""
            icon={Truck}
            action={
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={handleSave} 
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white hover:text-white"
                  disabled={isSaving || rows.length === 0}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            }
          />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {isLoadingHistory ? (
            <div className="bg-card rounded-xl border border-border p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Chargement de l'historique...</span>
            </div>
          ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex-1 flex flex-col min-h-0 h-full">
            <div className="overflow-auto flex-1 min-h-0 h-full pb-20">
              <table className="w-full border-collapse">
            <thead>
                    <tr className="bg-muted sticky top-0 z-20">
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground w-[140px] bg-muted">Date</th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[200px] bg-muted">Ville</th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[150px] bg-muted">Produit</th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[55px] bg-muted">Nbr sac</th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[65px] bg-muted">Poids sac</th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[110px] bg-muted">Tonnage</th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[120px] bg-muted">N° camion</th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[120px] bg-muted">N° chauffeur</th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[140px] bg-muted">Poid arrivé</th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[80px] bg-muted">Poids manqué</th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[140px] bg-muted">Dépenses</th>
                      <th className="px-0.5 py-2 text-center font-semibold text-xl text-card-foreground w-7 bg-muted">#</th>
              </tr>
            </thead>
            <tbody>
              {organizedRows.map((item, index) => {
                      const row = item.row;
                      // Calculer le poids manquant si nécessaire (pour les lignes chargées depuis l'API qui n'ont peut-être pas ce champ calculé)
                      let poidsManquantValue = row.poids_manquant;
                      if (poidsManquantValue === null || poidsManquantValue === undefined) {
                        if (row.poids_arrive !== null && row.poids_arrive !== undefined) {
                          poidsManquantValue = Math.max(0, row.tonnage_total - Number(row.poids_arrive));
                        }
                      }
                      const hasPoidsManquant = poidsManquantValue !== null && poidsManquantValue !== undefined && poidsManquantValue > 0;
                
                return (
                  <tr 
                    key={row.id} 
                        style={hasPoidsManquant ? { backgroundColor: 'rgba(252, 165, 165, 0.7)' } : undefined}
                    className={`border-t border-gray-400 dark:border-gray-600 transition-colors ${
                          hasPoidsManquant
                            ? "hover:bg-red-300"
                            : row.isSaved 
                              ? "bg-muted/10 hover:bg-muted/20" 
                        : "hover:bg-muted/20"
                    }`}
                  >
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <Input
                      type="text"
                      value={row.date_chargement ? convertDateToDisplay(row.date_chargement) : ""}
                      onChange={(e) => updateCell(row.id, "date_chargement", e.target.value)}
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-lg md:text-lg font-medium text-foreground"
                      placeholder="jj/mm/aaaa"
                    />
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <div className="flex items-center gap-0">
                      <Input
                        type="text"
                        value={row.ville_depart || ""}
                        onChange={(e) => updateCell(row.id, "ville_depart", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Space") {
                            e.preventDefault();
                            const nextInput = e.currentTarget.parentElement?.querySelector('input:nth-of-type(2)') as HTMLInputElement;
                            if (nextInput) {
                              nextInput.focus();
                            }
                          }
                        }}
                        className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-lg md:text-lg font-medium text-foreground flex-1"
                      />
                      <span className="text-xs font-medium px-0">-</span>
                      <Input
                        type="text"
                        value={row.ville_arrivee || ""}
                        onChange={(e) => updateCell(row.id, "ville_arrivee", e.target.value)}
                        className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-lg md:text-lg font-medium text-foreground flex-1"
                      />
                    </div>
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <Input
                      type="text"
                      list="types-denree"
                      value={row.type_denree}
                      onChange={(e) => updateCell(row.id, "type_denree", e.target.value)}
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-xl md:text-xl font-medium text-foreground"
                    />
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <Input
                      type="number"
                      value={row.nombre_sacs || ""}
                      onChange={(e) => updateCell(row.id, "nombre_sacs", Number(e.target.value))}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      min="0"
                    />
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <Input
                      type="number"
                      value={row.poids_par_sac || ""}
                      onChange={(e) => updateCell(row.id, "poids_par_sac", Number(e.target.value))}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      min="0"
                      step="0.01"
                    />
                  </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-right font-medium text-xl text-foreground bg-muted/20">
                    <span className="block w-full text-right text-lg">
                      {row.tonnage_total.toLocaleString()} <span className="text-base">kg</span>
                    </span>
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <Input
                            type="text"
                            value={row.numero_camion}
                            onChange={(e) => updateCell(row.id, "numero_camion", e.target.value)}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-lg md:text-lg font-medium text-foreground"
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <Input
                            type="text"
                            value={formatChauffeur(row.numero_chauffeur || "")}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\s/g, '');
                              updateCell(row.id, "numero_chauffeur", cleaned);
                            }}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-base md:text-base font-medium text-foreground"
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center gap-0 px-1">
                            <Input
                              type="text"
                              value={row.poids_arrive ? formatNumberWithSpaces(row.poids_arrive) : ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\s/g, '').replace(',', '.');
                                const numValue = cleaned === "" ? null : Number(cleaned);
                                updateCell(row.id, "poids_arrive", isNaN(numValue as number) ? null : numValue);
                              }}
                              className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-lg md:text-lg font-medium text-foreground flex-1"
                            />
                            <span className="text-base font-medium text-foreground">kg</span>
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-right font-medium text-xl text-foreground bg-muted/20">
                          <span className="block w-full text-right text-lg">
                            {poidsManquantValue !== null && poidsManquantValue !== undefined 
                              ? (
                                <>
                                  {poidsManquantValue.toLocaleString()} <span className="text-base">kg</span>
                                </>
                              )
                              : "-"}
                          </span>
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-right font-medium text-xl bg-muted/10">
                    <div className="flex items-center justify-end gap-0 w-full">
                      <Input
                        type="text"
                        value={row.depenses && row.depenses > 0 ? formatNumberWithSpaces(row.depenses) : ""}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\s/g, '').replace(',', '.');
                          const numValue = cleaned === "" ? 0 : Number(cleaned);
                          updateCell(row.id, "depenses", isNaN(numValue) ? 0 : numValue);
                        }}
                        className="border-0 rounded-none h-9 bg-transparent text-right text-lg md:text-lg w-full font-medium text-foreground"
                      />
                      <span className="text-sm font-medium">F</span>
                    </div>
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(row.id)}
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Supprimer cette ligne"
                      >
                        <Trash2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => generatePDF(row)}
                        className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                        title="Télécharger le PDF"
                      >
                        <Download size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
              </tbody>
            </table>
            </div>
          </div>
          )}

          {!isLoadingHistory && rows.length === 0 && (
            <div className="bg-muted/50 rounded-xl border border-border p-8 text-center">
              <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-medium text-card-foreground mb-2">
                Aucun chargement
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Cliquez sur "Nouvelle ligne" pour commencer à enregistrer des chargements de camion
              </p>
              <Button onClick={addRow} className="gap-2">
                <Plus size={16} />
                Ajouter une première ligne
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Bouton flottant pour ajouter une ligne */}
      <Button
        onClick={addRow}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg gap-2 z-50"
        size="icon"
      >
        <Plus size={24} />
      </Button>
    </DashboardLayout>
  );
}
