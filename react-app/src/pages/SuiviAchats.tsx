import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShoppingCart, Plus, Trash2, Save, Loader2, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config/api";

interface EntreeAchatRow {
  id: number;
  date: string;
  numero_entree: string;
  montant_ht: number | null;
  autres_charges: number | null;
  avance: number | null;
  restant: number | null;
  paye: number | null;
  montant_net: number | null;
  somme_restante: number | null;
  isSaved?: boolean;
  savedId?: number;
  clientId?: number;
}

const getStorageKey = (clientId?: string) => 
  clientId ? `client_achats_rows_${clientId}` : "client_achats_rows";

// Fonction pour trier les lignes par ordre d'insertion
const sortRowsByInsertionOrder = (rows: EntreeAchatRow[]): EntreeAchatRow[] => {
  return [...rows].sort((a, b) => {
    if (a.isSaved && b.isSaved) {
      return (a.savedId || 0) - (b.savedId || 0);
    }
    if (a.isSaved && !b.isSaved) {
      return -1;
    }
    if (!a.isSaved && b.isSaved) {
      return 1;
    }
    return a.id - b.id;
  });
};

// Fonction pour formater les nombres avec des espaces pour les milliers
const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "";
  const valueStr = String(value);
  const parts = valueStr.split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (parts.length === 1 || !parts[1] || parts[1].match(/^0+$/)) {
    return integerPart;
  }
  const decimalPart = parts[1].replace(/0+$/, "");
  return decimalPart ? integerPart + "," + decimalPart : integerPart;
};

const MOIS_FRANCAIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const getMonthFromDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const month = date.getMonth();
  const year = date.getFullYear();
  return `${MOIS_FRANCAIS[month]} ${year}`;
};

// Fonction pour obtenir la date d'aujourd'hui au format "jj/mm/aaaa"
const getTodayDate = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

// Fonction pour convertir une date au format API (aaaa-mm-jj)
const convertDateToAPIFormat = (dateString: string): string => {
  if (!dateString) return "";
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }
  
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // Si la conversion échoue, retourner la chaîne originale
  }
  
  return dateString;
};

// Fonction pour formater la date au format "jj/mm/aaaa"
const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return getTodayDate();
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString || getTodayDate();
  }
};

export default function SuiviAchats() {
  const { clientId } = useParams<{ clientId: string }>();
  const [rows, setRows] = useState<EntreeAchatRow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [clients, setClients] = useState<Array<{id: number, full_name: string}>>([]);
  const [currentClient, setCurrentClient] = useState<{id: number, full_name: string} | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Charger les clients depuis l'API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch(getApiUrl("customers/"));
        if (response.ok) {
          const data = await response.json();
          setClients(data);
          
          if (clientId) {
            const client = data.find((c: {id: number}) => c.id.toString() === clientId);
            if (client) {
              setCurrentClient(client);
            } else {
              toast({
                title: "Erreur",
                description: "Client introuvable",
                variant: "destructive",
              });
              navigate("/liste-achats");
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des clients:", error);
      }
    };
    fetchClients();
  }, [clientId, navigate, toast]);

  // Charger les entrées d'achat depuis l'API et localStorage
  useEffect(() => {
    if (!clientId || !currentClient) return;
    
    const loadAchats = async () => {
      try {
        // Charger depuis l'API
        const response = await fetch(getApiUrl(`entrees-achat/?client_id=${clientId}`));
        if (response.ok) {
          const apiData = await response.json();
          const apiRows: EntreeAchatRow[] = apiData.map((item: any) => ({
            id: item.id + 100000,
            date: formatDateDisplay(item.date),
            numero_entree: item.numero_entree || "",
            montant_ht: item.montant_ht ? parseFloat(item.montant_ht) : null,
            autres_charges: item.autres_charges ? parseFloat(item.autres_charges) : null,
            avance: item.avance ? parseFloat(item.avance) : null,
            restant: item.restant ? parseFloat(item.restant) : null,
            paye: item.paye ? parseFloat(item.paye) : null,
            montant_net: item.montant_net ? parseFloat(item.montant_net) : null,
            somme_restante: null,
            isSaved: true,
            savedId: item.id,
            clientId: currentClient.id,
          }));
          
          // Charger depuis localStorage seulement les lignes non enregistrées
          const storageKey = getStorageKey(clientId);
          const savedRows = localStorage.getItem(storageKey);
          let localRows: EntreeAchatRow[] = [];
          
          if (savedRows) {
            try {
              const parsed = JSON.parse(savedRows);
              localRows = Array.isArray(parsed) 
                ? parsed.filter((r: EntreeAchatRow) => !r.isSaved)
                : [];
            } catch (error) {
              console.error("Erreur lors du chargement des données locales:", error);
            }
          }
          
          const allRows = [...apiRows, ...localRows];
          const orderedRows = sortRowsByInsertionOrder(allRows);
          
          setRows(recalculateSommeRestante(orderedRows));
          
          const maxId = allRows.length > 0 
            ? Math.max(...allRows.map((r: EntreeAchatRow) => r.id))
            : 0;
          setNextId(maxId + 1);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des achats:", error);
      }
    };
    
    loadAchats();
  }, [clientId, currentClient]);

  // Enregistrer dans localStorage seulement les lignes non enregistrées
  useEffect(() => {
    if (clientId) {
      const storageKey = getStorageKey(clientId);
      const unsavedRows = rows.filter(r => !r.isSaved);
      if (unsavedRows.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(unsavedRows));
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, [rows, clientId]);

  // Fonction pour recalculer toutes les sommes restantes de manière cumulative
  const recalculateSommeRestante = (rowsToCalculate: EntreeAchatRow[]): EntreeAchatRow[] => {
    const sortedRows = [...rowsToCalculate];
    let somme_restante_precedente = 0;
    
    return sortedRows.map(row => {
      const montant_net = row.montant_net !== null ? Number(row.montant_net) : 0;
      const paye = row.paye !== null ? Number(row.paye) : 0;
      
      // Formule : somme_restante_précédente + montant_net - paye
      const somme_restante = somme_restante_precedente + montant_net - paye;
      somme_restante_precedente = somme_restante;
      
      return { ...row, somme_restante };
    });
  };

  const updateCell = (id: number, field: keyof EntreeAchatRow, value: string | number | null) => {
    setRows(prevRows => {
      const updatedRows = prevRows.map(row => {
        if (row.id === id) {
          if (field === "date" || field === "numero_entree") {
            return { ...row, [field]: value as string };
          }
          
          const numValue = value === "" || value === null || value === undefined ? null : (typeof value === "string" ? (value === "" ? null : Number(value)) : value);
          const updated = { ...row, [field]: numValue };
          
          // Recalculer le montant net si nécessaire
          if (field === "montant_ht" || field === "autres_charges" || field === "avance" || field === "restant") {
            const montant_ht = updated.montant_ht !== null ? Number(updated.montant_ht) : 0;
            const autres_charges = updated.autres_charges !== null ? Number(updated.autres_charges) : 0;
            const avance = updated.avance !== null ? Number(updated.avance) : 0;
            const restant = updated.restant !== null ? Number(updated.restant) : 0;
            
            // Montant net = HT - Autres charges - Avance + Restant
            updated.montant_net = montant_ht - autres_charges - avance + restant;
          }
          
          return updated;
        }
        return row;
      });
      
      return recalculateSommeRestante(updatedRows);
    });
  };

  const addRow = () => {
    if (!currentClient) {
      toast({
        title: "Erreur",
        description: "Aucun client sélectionné",
        variant: "destructive",
      });
      return;
    }

    const newRow: EntreeAchatRow = {
      id: nextId,
      date: getTodayDate(),
      numero_entree: "",
      montant_ht: null,
      autres_charges: null,
      avance: null,
      restant: null,
      paye: null,
      montant_net: null,
      somme_restante: null,
      isSaved: false,
      clientId: currentClient.id,
    };
    
    const updatedRows = [...rows, newRow];
    setRows(recalculateSommeRestante(updatedRows));
    setNextId(nextId + 1);
  };

  const handleDeleteClick = (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    setRowToDelete(id);
    setDeleteDialogOpen(true);
  };

  const deleteRow = async (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    if (row.isSaved && row.savedId) {
      try {
        const response = await fetch(getApiUrl(`entrees-achat/${row.savedId}/`), {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          let errorMessage = "Erreur lors de la suppression";
          try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const errorData = await response.json();
              errorMessage = errorData.detail || errorData.message || errorMessage;
            }
          } catch (e) {
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        toast({
          title: "Succès",
          description: "Entrée d'achat supprimée avec succès",
        });
        
        // Recharger les données depuis l'API
        if (clientId && currentClient) {
          const loadAchats = async () => {
            try {
              const response = await fetch(getApiUrl(`entrees-achat/?client_id=${clientId}`));
              if (response.ok) {
                const apiData = await response.json();
                const apiRows: EntreeAchatRow[] = apiData.map((item: any) => ({
                  id: item.id + 100000,
                  date: formatDateDisplay(item.date),
                  numero_entree: item.numero_entree || "",
                  montant_ht: item.montant_ht ? parseFloat(item.montant_ht) : null,
                  autres_charges: item.autres_charges ? parseFloat(item.autres_charges) : null,
                  avance: item.avance ? parseFloat(item.avance) : null,
                  restant: item.restant ? parseFloat(item.restant) : null,
                  paye: item.paye ? parseFloat(item.paye) : null,
                  montant_net: item.montant_net ? parseFloat(item.montant_net) : null,
                  somme_restante: null,
                  isSaved: true,
                  savedId: item.id,
                  clientId: currentClient.id,
                }));

                const savedRows = localStorage.getItem(getStorageKey(clientId));
                let unsavedRows: EntreeAchatRow[] = [];
                if (savedRows) {
                  try {
                    unsavedRows = JSON.parse(savedRows).filter((r: EntreeAchatRow) => !r.isSaved);
                  } catch (e) {
                    console.error("Erreur lors du chargement des données:", e);
                  }
                }

                const allRows = [...apiRows, ...unsavedRows];
                const orderedRows = sortRowsByInsertionOrder(allRows);
                
                setRows(recalculateSommeRestante(orderedRows));
              }
            } catch (error) {
              console.error("Erreur lors du rechargement:", error);
            }
          };
          loadAchats();
        }
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message || "Impossible de supprimer l'entrée d'achat",
          variant: "destructive",
        });
        console.error("Erreur suppression:", error);
      } finally {
        setDeleteDialogOpen(false);
        setRowToDelete(null);
      }
    } else {
      const updatedRows = rows.filter(row => row.id !== id);
      setRows(recalculateSommeRestante(updatedRows));
      toast({
        title: "Succès",
        description: "Ligne supprimée",
      });
      setDeleteDialogOpen(false);
      setRowToDelete(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (rowToDelete !== null) {
      await deleteRow(rowToDelete);
    }
  };

  const validateRow = (row: EntreeAchatRow): string | null => {
    // Permettre l'enregistrement si la ligne est complètement vide
    const isRowEmpty = !row.date && !row.nom_client?.trim() && !row.nom_produit?.trim() &&
                       (!row.gros || row.gros === 0) && (!row.unit || row.unit === 0) &&
                       (!row.quantite_kg || row.quantite_kg === 0);
    if (isRowEmpty) return null;
    
    // Si au moins un champ est rempli, valider les champs requis
    if (!row.date) return "La date est requise";
    return null;
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

    if (row.isSaved && savingRowId !== row.id) {
      toast({
        title: "Déjà enregistré",
        description: "Cette entrée d'achat a déjà été enregistrée",
      });
      return;
    }

    const clientIdToUse = row.clientId || currentClient?.id;
    if (!clientIdToUse) {
      toast({
        title: "Erreur",
        description: "Client introuvable",
        variant: "destructive",
      });
      return;
    }

    setSavingRowId(rowId);

    try {
      // Pour créer une entrée d'achat, on doit créer une entrée avec au moins un achat
      // Ici on crée une entrée vide avec un achat fictif
      const payload = {
        date: convertDateToAPIFormat(row.date),
        client: clientIdToUse,
        nom_client: "",
        transport: 0,
        autres_charges: row.autres_charges ?? 0,
        avance: row.avance ?? 0,
        restant: row.restant ?? 0,
        paye: row.paye ?? 0,
        achats: [{
          date: convertDateToAPIFormat(row.date),
          produit: null,
          nom_produit: "Suivi achat",
          gros: 0,
          unit: 0,
          quantite_kg: 1,
          prix_unitaire: row.montant_ht ?? 0,
        }],
      };

      const response = await fetch(getApiUrl("entrees-achat/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de l'enregistrement");
      }

      const savedData = await response.json();
      
      setRows(prevRows => {
        const updatedRows = prevRows.map(r => {
          if (r.id === rowId) {
            return { 
              ...r, 
              isSaved: true, 
              savedId: savedData.id,
              numero_entree: savedData.numero_entree || "",
              montant_ht: savedData.montant_ht ? parseFloat(savedData.montant_ht) : null,
              montant_net: savedData.montant_net ? parseFloat(savedData.montant_net) : null,
              clientId: clientIdToUse 
            };
          }
          return r;
        });
        return recalculateSommeRestante(updatedRows);
      });

      toast({
        title: "Succès !",
        description: "Entrée d'achat enregistrée avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setSavingRowId(null);
    }
  };

  const handleSave = async () => {
    const unsavedRows = rows.filter(r => !r.isSaved);
    
    if (unsavedRows.length === 0) {
      toast({
        title: "Aucune ligne à enregistrer",
        description: "Toutes les lignes sont déjà enregistrées",
        variant: "destructive",
      });
      return;
    }

    const errors: string[] = [];
    unsavedRows.forEach((row, index) => {
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

    if (!currentClient) {
      toast({
        title: "Erreur",
        description: "Aucun client sélectionné",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const savePromises = unsavedRows.map(async (row) => {
        const payload = {
          date: convertDateToAPIFormat(row.date),
          client: currentClient.id,
          nom_client: "",
          transport: 0,
          autres_charges: row.autres_charges ?? 0,
          avance: row.avance ?? 0,
          restant: row.restant ?? 0,
          paye: row.paye ?? 0,
          achats: [{
            date: convertDateToAPIFormat(row.date),
            produit: null,
            nom_produit: "Suivi achat",
            gros: 0,
            unit: 0,
            quantite_kg: 1,
            prix_unitaire: row.montant_ht ?? 0,
          }],
        };

        const response = await fetch(getApiUrl("entrees-achat/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorMessage = "Erreur lors de l'enregistrement";
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

      const savedData = await Promise.all(savePromises);

      setRows(prevRows => {
        const savedDataMap = new Map();
        unsavedRows.forEach((row, index) => {
          savedDataMap.set(row.id, savedData[index]);
        });

        const updatedRows = prevRows.map(row => {
          if (!row.isSaved) {
            const savedItem = savedDataMap.get(row.id);
            if (savedItem) {
              return { 
                ...row, 
                isSaved: true, 
                savedId: savedItem.id,
                numero_entree: savedItem.numero_entree || "",
                montant_ht: savedItem.montant_ht ? parseFloat(savedItem.montant_ht) : null,
                montant_net: savedItem.montant_net ? parseFloat(savedItem.montant_net) : null,
                clientId: currentClient.id 
              };
            }
          }
          return row;
        });
        
        const finalRows = recalculateSommeRestante(updatedRows);
        
        if (clientId) {
          const storageKey = getStorageKey(clientId);
          const remainingUnsavedRows = finalRows.filter(r => !r.isSaved);
          if (remainingUnsavedRows.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(remainingUnsavedRows));
          } else {
            localStorage.removeItem(storageKey);
          }
        }
        
        return finalRows;
      });

      toast({
        title: "Succès !",
        description: `${unsavedRows.length} entrée(s) d'achat enregistrée(s) avec succès`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Organiser les lignes par mois
  const organizeRowsByMonth = () => {
    if (rows.length === 0) return [];
    
    const sortedRows = [...rows];
    
    const organized: Array<{ row: EntreeAchatRow, month?: string, showMonth?: boolean }> = [];
    let currentMonth = "";
    
    sortedRows.forEach((row) => {
      const rowMonth = row.date ? getMonthFromDate(row.date) : "";
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
      <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="flex-shrink-0 mb-4">
          <PageHeader
            title={currentClient ? `Suivi Achat - ${currentClient.full_name}` : "Suivi Achat"}
            description={currentClient ? "Achats et dettes de ce client (fournisseur)" : "Sélectionnez un client"}
            icon={ShoppingCart}
            action={
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => navigate("/liste-achats")}
                  className="gap-2"
                >
                  <ArrowLeft size={16} />
                  Retour
                </Button>
                {currentClient && (
                  <>
                    <Button 
                      variant="secondary" 
                      onClick={handleSave} 
                      className="gap-2"
                      disabled={isSaving || rows.filter(r => !r.isSaved).length === 0}
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
                  </>
                )}
              </div>
            }
          />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {currentClient ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex-1 flex flex-col min-h-0 h-full">
              <div className="overflow-auto flex-1 min-h-0 h-full">
                <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted sticky top-0 z-20">
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-center font-semibold text-xl text-card-foreground w-[50px] bg-muted">N°</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground w-[150px] bg-muted">Date</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[120px] bg-muted">N° Entrée</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[130px] bg-muted">Montant HT</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[110px] bg-muted">Charge</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[110px] bg-muted">Avance</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[110px] bg-muted">Restant</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[130px] bg-muted">Montant Net</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[110px] bg-muted">Payé</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[150px] bg-muted font-bold">Somme restante</th>
                    <th className="px-0.5 py-2 text-center font-semibold text-xl text-card-foreground w-7 bg-muted">#</th>
                  </tr>
                </thead>
                <tbody>
                  {organizedRows.map((item, index) => {
                    const row = item.row;
                    
                    return (
                      <tr 
                        key={row.savedId ? `saved-${row.savedId}` : `unsaved-${row.id}`} 
                        className={`border-t border-gray-400 dark:border-gray-600 transition-colors ${
                          row.isSaved 
                            ? "bg-muted/10 hover:bg-muted/20" 
                            : "hover:bg-muted/20"
                        }`}
                      >
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center font-medium text-xl text-foreground">
                          {index + 1}
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <Input
                            type="text"
                            value={row.date || ""}
                            onChange={(e) => updateCell(row.id, "date", e.target.value)}
                            onBlur={(e) => {
                              if (!e.target.value.trim()) {
                                updateCell(row.id, "date", getTodayDate());
                              }
                            }}
                            placeholder={getTodayDate()}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-lg md:text-lg font-medium text-foreground"
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-left font-medium text-xl text-foreground bg-muted/20">
                          {row.numero_entree || "-"}
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center justify-end">
                            <Input
                              type="text"
                              value={row.montant_ht !== null && row.montant_ht !== undefined ? formatNumber(row.montant_ht) : ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                const num = cleaned === "" ? null : Number(cleaned);
                                updateCell(row.id, "montant_ht", isNaN(num as number) ? null : num);
                              }}
                              className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default flex-1"
                              placeholder="0"
                              disabled={row.isSaved && savingRowId !== row.id}
                            />
                            {row.montant_ht !== null && row.montant_ht !== undefined && row.montant_ht > 0 && (
                              <span className="text-base text-muted-foreground px-1">F</span>
                            )}
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center justify-end">
                            <Input
                              type="text"
                              value={row.autres_charges !== null && row.autres_charges !== undefined ? formatNumber(row.autres_charges) : ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                const num = cleaned === "" ? null : Number(cleaned);
                                updateCell(row.id, "autres_charges", isNaN(num as number) ? null : num);
                              }}
                              className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default flex-1"
                              placeholder="0"
                              disabled={row.isSaved && savingRowId !== row.id}
                            />
                            {row.autres_charges !== null && row.autres_charges !== undefined && row.autres_charges > 0 && (
                              <span className="text-base text-muted-foreground px-1">F</span>
                            )}
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center justify-end">
                            <Input
                              type="text"
                              value={row.avance !== null && row.avance !== undefined ? formatNumber(row.avance) : ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                const num = cleaned === "" ? null : Number(cleaned);
                                updateCell(row.id, "avance", isNaN(num as number) ? null : num);
                              }}
                              className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default flex-1"
                              placeholder="0"
                              disabled={row.isSaved && savingRowId !== row.id}
                            />
                            {row.avance !== null && row.avance !== undefined && row.avance > 0 && (
                              <span className="text-base text-muted-foreground px-1">F</span>
                            )}
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center justify-end">
                            <Input
                              type="text"
                              value={row.restant !== null && row.restant !== undefined ? formatNumber(row.restant) : ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                const num = cleaned === "" ? null : Number(cleaned);
                                updateCell(row.id, "restant", isNaN(num as number) ? null : num);
                              }}
                              className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default flex-1"
                              placeholder="0"
                              disabled={row.isSaved && savingRowId !== row.id}
                            />
                            {row.restant !== null && row.restant !== undefined && row.restant > 0 && (
                              <span className="text-base text-muted-foreground px-1">F</span>
                            )}
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-right font-medium text-xl text-foreground bg-muted/20">
                          {row.montant_net !== null && row.montant_net !== undefined ? (
                            <span className="block w-full text-right text-lg">
                              {formatNumber(row.montant_net)} <span className="text-base">F</span>
                            </span>
                          ) : (
                            <span className="block w-full text-right text-lg">-</span>
                          )}
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center justify-end">
                            <Input
                              type="text"
                              value={row.paye !== null && row.paye !== undefined ? formatNumber(row.paye) : ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                const num = cleaned === "" ? null : Number(cleaned);
                                updateCell(row.id, "paye", isNaN(num as number) ? null : num);
                              }}
                              className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default flex-1"
                              placeholder="0"
                              disabled={row.isSaved && savingRowId !== row.id}
                            />
                            {row.paye !== null && row.paye !== undefined && row.paye > 0 && (
                              <span className="text-base text-muted-foreground px-1">F</span>
                            )}
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-right font-bold text-xl text-foreground bg-muted/20">
                          {row.somme_restante !== null && row.somme_restante !== undefined ? (
                            <span className={`block w-full text-right text-lg font-bold ${row.somme_restante > 0 ? "text-green-600 dark:text-green-400" : row.somme_restante < 0 ? "text-destructive" : "text-card-foreground"}`}>
                              {row.somme_restante > 0 ? "+" : ""}{formatNumber(row.somme_restante)} <span className="text-base font-bold">F</span>
                            </span>
                          ) : (
                            <span className="block w-full text-right text-lg font-bold">-</span>
                          )}
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(row.id)}
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && (
              <div className="bg-muted/50 rounded-xl border border-border p-8 text-center m-4">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-card-foreground mb-2">
                  Aucun achat pour ce client
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Cliquez sur "Nouvelle ligne" pour commencer à enregistrer des achats
                </p>
                <Button onClick={addRow} className="gap-2">
                  <Plus size={16} />
                  Ajouter une première ligne
                </Button>
              </div>
            )}
          </div>
          ) : (
            <div className="bg-muted/50 rounded-xl border border-border p-8 text-center">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-card-foreground mb-2">
                Aucun client sélectionné
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Retournez à la liste des clients pour sélectionner un client
              </p>
              <Button onClick={() => navigate("/liste-achats")} className="gap-2">
                <ArrowLeft size={16} />
                Voir la liste des clients
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Bouton flottant pour ajouter une ligne */}
      {currentClient && (
        <Button
          onClick={addRow}
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg gap-2 z-50"
          size="icon"
        >
          <Plus size={24} />
        </Button>
      )}

      {/* Modal de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette ligne ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

