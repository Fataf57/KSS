import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Receipt, Plus, Trash2, Loader2, Download, StopCircle, Save, ArrowLeft } from "lucide-react";
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
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface DepenseRow {
  id: number;
  date: string;
  nom_depense: string;
  somme: number | null;
  notes?: string;
  isSaved?: boolean;
  savedId?: number;
  isPeriodStop?: boolean;
  periodTotal?: number;
  periodIndex?: number;
}

const STORAGE_KEY = "depenses_rows";

// Fonction pour obtenir la date d'aujourd'hui au format "jj/mm/aaaa"
const getTodayDate = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
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

// Fonction pour formater la date au format "jj/mm/aaaa"
const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return "";
  if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return dateString;
  }
  try {
    let date: Date;
    if (dateString.includes('T') || dateString.includes('-')) {
      date = new Date(dateString);
    } else {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        date = new Date(dateString);
      }
    }
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

// Fonction pour convertir une date au format ISO (YYYY-MM-DD)
const convertDateToISO = (dateString: string): string => {
  if (!dateString) return "";
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const parts = dateString.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return dateString;
  }
};

export default function Depenses() {
  const [rows, setRows] = useState<DepenseRow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStopping, setIsStopping] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [periodStops, setPeriodStops] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Charger les dépenses depuis l'API et localStorage
  useEffect(() => {
    const loadDepenses = async () => {
      setIsLoading(true);
      try {
        // Charger depuis l'API
        const response = await fetch(getApiUrl("depenses/"));
        if (response.ok) {
          const apiData = await response.json();
          const apiRows: DepenseRow[] = apiData.map((item: any) => {
            // Détecter si c'est une ligne de fin de période
            const isPeriodStop = item.nom_depense && item.nom_depense.startsWith("FIN DE COMPTE");
            return {
              id: item.id + 100000,
              date: item.date,
              nom_depense: item.nom_depense || "",
              somme: item.somme ? parseFloat(item.somme) : null,
              notes: item.notes || "",
              isSaved: true,
              savedId: item.id,
              isPeriodStop: isPeriodStop,
              periodTotal: isPeriodStop ? (item.somme ? parseFloat(item.somme) : null) : null,
              periodIndex: isPeriodStop ? parseInt(item.nom_depense.match(/PÉRIODE (\d+)/)?.[1] || "0") : undefined,
            };
          });
          
          // Charger depuis localStorage (seulement les lignes non sauvegardées et non fin de période)
          const savedRowsStorage = localStorage.getItem(STORAGE_KEY);
          let localRows: DepenseRow[] = [];
          
          if (savedRowsStorage) {
            try {
              const parsed = JSON.parse(savedRowsStorage);
              // Filtrer les lignes de fin de période et les lignes déjà sauvegardées
              localRows = parsed.filter((r: DepenseRow) => {
                // Ne garder que les lignes non sauvegardées et non fin de période
                return !r.isSaved && !r.isPeriodStop && !(r.nom_depense && r.nom_depense.startsWith("FIN DE COMPTE"));
              });
              
              // Nettoyer localStorage si on a filtré des lignes
              if (localRows.length !== parsed.length) {
                if (localRows.length > 0) {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(localRows));
                } else {
                  localStorage.removeItem(STORAGE_KEY);
                }
              }
            } catch (error) {
              console.error("Erreur lors du chargement des données locales:", error);
              // En cas d'erreur, nettoyer localStorage
              localStorage.removeItem(STORAGE_KEY);
            }
          }
          
          // Combiner les deux sources (API + localStorage)
          // Trier les lignes sauvegardées par ID pour maintenir l'ordre chronologique
          const savedRowsArray = [...apiRows];
          const unsavedRows = localRows;
          
          // Trier les lignes sauvegardées par savedId pour maintenir l'ordre chronologique
          // Les lignes de fin de période sont incluses dans le tri pour maintenir leur position
          savedRowsArray.sort((a, b) => {
            if (a.isSaved && a.savedId && b.isSaved && b.savedId) {
              return (a.savedId || 0) - (b.savedId || 0);
            }
            // Si une ligne n'a pas de savedId, la placer à la fin
            if (a.isSaved && a.savedId) return -1;
            if (b.isSaved && b.savedId) return 1;
            return 0;
          });
          
          // Recombiner : lignes sauvegardées triées + lignes non sauvegardées
          const allRows = [...savedRowsArray, ...unsavedRows];
          setRows(allRows);
          
          const maxId = allRows.length > 0 
            ? Math.max(...allRows.map((r: DepenseRow) => r.id))
            : 0;
          setNextId(maxId + 1);
        } else {
          console.error("Erreur API:", response.status, response.statusText);
          // Si l'API échoue, charger depuis localStorage seulement
          const savedRows = localStorage.getItem(STORAGE_KEY);
          if (savedRows) {
            try {
              const parsed = JSON.parse(savedRows);
              const localRows = parsed.filter((r: DepenseRow) => !r.isPeriodStop && !(r.nom_depense && r.nom_depense.startsWith("FIN DE COMPTE")));
              setRows(localRows);
            } catch (error) {
              console.error("Erreur lors du chargement des données locales:", error);
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des dépenses:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les dépenses depuis le serveur",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDepenses();
    fetchPeriodStops();
  }, []);

  const fetchPeriodStops = async () => {
    try {
      const response = await fetch(getApiUrl("period-stops/"));
      if (response.ok) {
        const data = await response.json();
        setPeriodStops(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des arrêts de compte:", error);
    }
  };

  // Enregistrer dans localStorage à chaque modification (seulement les lignes non sauvegardées et non fin de période)
  useEffect(() => {
    if (rows.length > 0) {
      const unsavedRows = rows.filter(r => !r.isSaved && !r.isPeriodStop);
      if (unsavedRows.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unsavedRows));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      // Nettoyer localStorage si aucune ligne
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [rows]);

  const updateCell = (id: number, field: keyof DepenseRow, value: string | number | null) => {
    setRows(prevRows => {
      return prevRows.map(row => {
        if (row.id === id) {
          const updatedValue = value === "" || value === null || value === undefined 
            ? null 
            : (typeof value === "string" ? value : value);
          
          return { ...row, [field]: updatedValue };
        }
        return row;
      });
    });
  };

  const addRow = () => {
    const newRow: DepenseRow = {
      id: nextId,
      date: getTodayDate(),
      nom_depense: "",
      somme: null,
      notes: "",
      isSaved: false,
    };
    setRows([...rows, newRow]);
    setNextId(nextId + 1);
    
    // Faire défiler vers le bas pour afficher la nouvelle ligne
    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Vérifier si une dépense fait partie d'une période déjà arrêtée
  const isDepenseInStoppedPeriod = (row: DepenseRow): boolean => {
    // Si la dépense n'est pas sauvegardée, elle ne peut pas être dans une période arrêtée
    if (!row.isSaved || !row.savedId) {
      return false;
    }

    // Trouver toutes les lignes "FIN DE COMPTE" sauvegardées
    const periodStops = rows.filter(r => r.isPeriodStop && r.isSaved && r.savedId);
    
    // Vérifier s'il existe une ligne "FIN DE COMPTE" avec un savedId supérieur à celui de cette dépense
    // Cela signifie que cette dépense fait partie d'une période qui a été arrêtée
    return periodStops.some(stop => stop.savedId && stop.savedId > row.savedId);
  };

  const handleDeleteClick = (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    // Empêcher la suppression des lignes de fin de période
    if (row.isPeriodStop) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer une ligne de fin de période",
        variant: "destructive",
      });
      return;
    }

    // Empêcher la suppression des dépenses dans une période déjà arrêtée
    if (isDepenseInStoppedPeriod(row)) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer une dépense d'une période déjà arrêtée",
        variant: "destructive",
      });
      return;
    }

    setRowToDelete(id);
    setDeleteDialogOpen(true);
  };

  const deleteRow = async (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    if (row.isSaved && row.savedId) {
      try {
        const response = await fetch(getApiUrl(`depenses/${row.savedId}/`), {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Erreur lors de la suppression");
        }

        toast({
          title: "Succès",
          description: "Dépense supprimée avec succès",
        });
        
        setRows(rows.filter(row => row.id !== id));
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message || "Impossible de supprimer la dépense",
          variant: "destructive",
        });
        return;
      } finally {
        setDeleteDialogOpen(false);
        setRowToDelete(null);
      }
    } else {
      setRows(rows.filter(row => row.id !== id));
      setDeleteDialogOpen(false);
      setRowToDelete(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (rowToDelete !== null) {
      await deleteRow(rowToDelete);
    }
  };

  const validateRow = (row: DepenseRow): string | null => {
    // Ne pas valider les lignes de fin de période
    if (row.isPeriodStop) return null;
    
    // Permettre l'enregistrement si la ligne est complètement vide
    const isRowEmpty = !row.date && !row.nom_depense?.trim() && 
                       (row.somme === null || row.somme === undefined || row.somme <= 0);
    if (isRowEmpty) return null;
    
    // Si au moins un champ est rempli, valider les champs requis
    if (!row.date) return "La date est requise";
    if (!row.nom_depense || !row.nom_depense.trim()) return "Le nom de la dépense est requis";
    if (row.somme === null || row.somme === undefined || row.somme <= 0) return "La somme doit être positive";
    return null;
  };

  const handleSave = async () => {
    const rowsToSave = rows.filter(r => !r.isSaved && !r.isPeriodStop);
    if (rowsToSave.length === 0) {
      toast({
        title: "Aucune ligne à enregistrer",
        description: "Toutes les lignes sont déjà enregistrées",
        variant: "destructive",
      });
      return;
    }

    const errors: string[] = [];
    rowsToSave.forEach((row, index) => {
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

    setIsSaving(true);

    try {
      const savePromises = rowsToSave.map(async (row) => {
        const dateISO = convertDateToISO(row.date);
        
        const payload = {
          date: dateISO,
          nom_depense: row.nom_depense.trim(),
          somme: row.somme || 0,
          notes: row.notes || "",
        };

        const response = await fetch(getApiUrl("depenses/"), {
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
            if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (errorData.non_field_errors) {
              errorMessage = Array.isArray(errorData.non_field_errors) 
                ? errorData.non_field_errors.join(", ")
                : errorData.non_field_errors;
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

      const savedResults = await Promise.all(savePromises);

      toast({
        title: "Succès !",
        description: `${rowsToSave.length} dépense(s) enregistrée(s) avec succès`,
      });

      // Mettre à jour les lignes sauvegardées directement dans le state
      setRows(prevRows => {
        // Créer un map des IDs des lignes sauvegardées avec leurs nouveaux savedId
        const savedIdsMap = new Map<number, number>();
        rowsToSave.forEach((row, index) => {
          if (savedResults[index] && savedResults[index].id) {
            savedIdsMap.set(row.id, savedResults[index].id);
          }
        });

        // Mettre à jour les lignes sauvegardées et utiliser le même format d'ID que lors du chargement depuis l'API
        const updatedRows = prevRows.map(row => {
          const newSavedId = savedIdsMap.get(row.id);
          if (newSavedId !== undefined) {
            // Cette ligne vient d'être sauvegardée, la mettre à jour avec le format d'ID cohérent
            return {
              ...row,
              id: newSavedId + 100000, // Utiliser le même format que lors du chargement depuis l'API
              isSaved: true,
              savedId: newSavedId,
            };
          }
          return row;
        });

        // Filtrer les doublons : si une ligne a le même savedId qu'une autre, garder seulement une
        const seenSavedIds = new Set<number>();
        return updatedRows.filter(row => {
          if (row.isSaved && row.savedId) {
            if (seenSavedIds.has(row.savedId)) {
              return false; // Doublon, supprimer
            }
            seenSavedIds.add(row.savedId);
          }
          return true;
        });
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

  const calculateTotal = () => {
    try {
      if (!rows || rows.length === 0) {
        return 0;
      }
      return rows.reduce((sum, row) => {
        return sum + (row.somme || 0);
      }, 0);
    } catch (error) {
      console.error("Erreur dans calculateTotal:", error);
      return 0;
    }
  };

  const getCurrentPeriodDepenses = () => {
    try {
      if (!rows || rows.length === 0) {
        return [];
      }
      
      // Trier les lignes par savedId pour avoir l'ordre chronologique
      const sortedRows = [...rows].sort((a, b) => {
        // Les lignes sauvegardées sont triées par savedId
        if (a.isSaved && a.savedId && b.isSaved && b.savedId) {
          return (a.savedId || 0) - (b.savedId || 0);
        }
        // Les lignes sauvegardées viennent avant les non sauvegardées
        if (a.isSaved && a.savedId) return -1;
        if (b.isSaved && b.savedId) return 1;
        // Les lignes non sauvegardées gardent leur ordre (par id)
        return (a.id || 0) - (b.id || 0);
      });
      
      // Trouver l'index de la dernière ligne "FIN DE COMPTE" dans les lignes triées
      let lastPeriodStopIndex = -1;
      for (let i = sortedRows.length - 1; i >= 0; i--) {
        if (sortedRows[i].isPeriodStop && sortedRows[i].isSaved && sortedRows[i].savedId) {
          lastPeriodStopIndex = i;
          break;
        }
      }
      
      if (lastPeriodStopIndex === -1) {
        // Pas de ligne "FIN DE COMPTE", toutes les dépenses font partie de la période actuelle
        // Exclure les lignes "FIN DE COMPTE" du calcul
        return sortedRows.filter(r => !r.isPeriodStop);
      }
      
      // Retourner seulement les dépenses qui viennent APRÈS la dernière ligne "FIN DE COMPTE"
      // (à partir de l'index suivant la dernière "FIN DE COMPTE")
      const currentPeriodRows = sortedRows.slice(lastPeriodStopIndex + 1).filter((row) => {
        // Exclure toutes les lignes "FIN DE COMPTE"
        return !row.isPeriodStop;
      });
      
      return currentPeriodRows;
    } catch (error) {
      console.error("Erreur dans getCurrentPeriodDepenses:", error);
      return [];
    }
  };

  const calculatePeriodTotal = () => {
    try {
      const periodDepenses = getCurrentPeriodDepenses();
      // Calculer le total des dépenses de la période actuelle (sans les lignes "FIN DE COMPTE")
      return periodDepenses.reduce((sum, row) => {
        // S'assurer qu'on ne compte pas les lignes "FIN DE COMPTE" (déjà filtrées)
        if (row.isPeriodStop) {
          return sum;
        }
        return sum + (row.somme || 0);
      }, 0);
    } catch (error) {
      console.error("Erreur dans calculatePeriodTotal:", error);
      return 0;
    }
  };

  // Organiser les lignes avec les arrêts de période et gérer la numérotation
  const organizeRowsWithPeriodStops = () => {
    return rows.map(row => ({ 
      type: row.isPeriodStop ? 'period-stop' as const : 'depense' as const, 
      row, 
      periodTotal: row.periodTotal || null, 
      periodIndex: row.periodIndex || null,
      stopIndex: row.isPeriodStop ? row.savedId : undefined
    }));
  };

  const handleStopPeriod = async () => {
    // Calculer le total de la période actuelle (seulement les dépenses après la dernière "FIN DE COMPTE")
    const currentPeriodRows = getCurrentPeriodDepenses();
    if (currentPeriodRows.length === 0) {
      toast({
        title: "Erreur",
        description: "Aucune dépense à arrêter",
        variant: "destructive",
      });
      return;
    }

    setIsStopping(true);
    try {
      const periodTotal = currentPeriodRows.reduce((sum, r) => sum + (r.somme || 0), 0);
      
      // Compter le nombre de périodes déjà arrêtées
      const existingPeriodStops = rows.filter(r => r.isPeriodStop).length;
      const periodIndex = existingPeriodStops + 1;

      // Sauvegarder la ligne "FIN DE COMPTE" dans le backend
      const dateISO = convertDateToISO(getTodayDate());
      const nomDepense = `FIN DE COMPTE`;
      
      const response = await fetch(getApiUrl("depenses/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: dateISO,
          nom_depense: nomDepense,
          somme: periodTotal,
          notes: `Arrêt de compte - Période ${periodIndex}`,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Erreur lors de l'enregistrement de la fin de période";
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.nom_depense) {
            errorMessage = Array.isArray(errorData.nom_depense) 
              ? errorData.nom_depense[0] 
              : errorData.nom_depense;
          } else if (errorData.somme) {
            errorMessage = Array.isArray(errorData.somme) 
              ? errorData.somme[0] 
              : errorData.somme;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const savedData = await response.json();
      
      // Vérifier que l'ID est présent dans la réponse
      if (!savedData.id) {
        // Si l'ID n'est pas dans la réponse, essayer de le récupérer depuis l'API
        const checkResponse = await fetch(getApiUrl(`depenses/?search=${encodeURIComponent(nomDepense)}`));
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          const foundDepense = checkData.find((d: any) => 
            d.nom_depense === nomDepense && 
            Math.abs(parseFloat(d.somme) - periodTotal) < 0.01
          );
          if (foundDepense) {
            savedData.id = foundDepense.id;
          }
        }
      }
      
      // Créer la ligne spéciale "FIN DE COMPTE" avec les données du backend
      const periodStopRow: DepenseRow = {
        id: savedData.id ? savedData.id + 100000 : nextId,
        date: savedData.date || dateISO,
        nom_depense: nomDepense,
        somme: periodTotal,
        notes: savedData.notes || `Arrêt de compte - Période ${periodIndex}`,
        isSaved: !!savedData.id,
        savedId: savedData.id || undefined,
        isPeriodStop: true,
        periodTotal: periodTotal,
        periodIndex: periodIndex,
      };

      // Trouver la position où insérer la ligne "FIN DE COMPTE"
      // Elle doit être insérée juste après la dernière dépense sauvegardée de la période actuelle
      // Les dépenses non sauvegardées restent après la ligne "FIN DE COMPTE"
      const savedPeriodRows = rows.filter(r => !r.isPeriodStop && r.isSaved && r.savedId);
      const unsavedRows = rows.filter(r => !r.isPeriodStop && !r.isSaved);
      
      // Trier les dépenses sauvegardées par ID pour maintenir l'ordre
      savedPeriodRows.sort((a, b) => (a.savedId || 0) - (b.savedId || 0));
      
      // Insérer la ligne "FIN DE COMPTE" après toutes les dépenses sauvegardées de la période
      // Les dépenses non sauvegardées restent après
      setRows([...savedPeriodRows, periodStopRow, ...unsavedRows]);
      
      if (!savedData.id) {
        setNextId(nextId + 1);
      }

      // Sauvegarder l'arrêt dans period-stops si nécessaire
      const savedRows = rows.filter(r => r.isSaved && r.savedId && !r.isPeriodStop);
      if (savedRows.length > 0) {
        const lastDepense = savedRows[savedRows.length - 1];
        const stopIndex = lastDepense.savedId!;

        try {
          await fetch(getApiUrl("period-stops/"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              stop_index: stopIndex,
            }),
          });
        } catch (error) {
          console.error("Erreur lors de la sauvegarde de l'arrêt:", error);
        }
      }

      toast({
        title: "Succès !",
        description: `Compte arrêté avec un total de ${formatNumber(periodTotal)} FCFA`,
      });

      // Recharger les données depuis l'API pour synchroniser
      try {
        const reloadResponse = await fetch(getApiUrl("depenses/"));
        if (reloadResponse.ok) {
          const apiData = await reloadResponse.json();
          const apiRows: DepenseRow[] = apiData.map((item: any) => {
            const isPeriodStop = item.nom_depense && item.nom_depense.startsWith("FIN DE COMPTE");
            return {
              id: item.id + 100000,
              date: item.date,
              nom_depense: item.nom_depense || "",
              somme: item.somme ? parseFloat(item.somme) : null,
              notes: item.notes || "",
              isSaved: true,
              savedId: item.id,
              isPeriodStop: isPeriodStop,
              periodTotal: isPeriodStop ? (item.somme ? parseFloat(item.somme) : null) : null,
              periodIndex: isPeriodStop ? parseInt(item.nom_depense.match(/PÉRIODE (\d+)/)?.[1] || "0") : undefined,
            };
          });
          
          // Charger depuis localStorage (seulement les lignes non enregistrées et non fin de période)
          const savedRowsStorage = localStorage.getItem(STORAGE_KEY);
          let localRows: DepenseRow[] = [];
          
          if (savedRowsStorage) {
            try {
              const parsed = JSON.parse(savedRowsStorage);
              localRows = parsed.filter((r: DepenseRow) => !r.isSaved && !r.isPeriodStop);
            } catch (error) {
              console.error("Erreur lors du chargement des données locales:", error);
            }
          }
          
          // Trier les lignes sauvegardées par ID pour maintenir l'ordre chronologique
          const savedRowsArray = [...apiRows];
          const unsavedRowsArray = localRows;
          
          // Trier les lignes sauvegardées par savedId pour maintenir l'ordre chronologique
          savedRowsArray.sort((a, b) => {
            if (a.isSaved && a.savedId && b.isSaved && b.savedId) {
              return (a.savedId || 0) - (b.savedId || 0);
            }
            // Si une ligne n'a pas de savedId, la placer à la fin
            if (a.isSaved && a.savedId) return -1;
            if (b.isSaved && b.savedId) return 1;
            return 0;
          });
          
          // Recombiner : lignes sauvegardées triées + lignes non sauvegardées
          setRows([...savedRowsArray, ...unsavedRowsArray]);
        }
      } catch (error) {
        console.error("Erreur lors du rechargement:", error);
      }

      fetchPeriodStops();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'arrêter le compte",
        variant: "destructive",
      });
    } finally {
      setIsStopping(false);
    }
  };

  const generatePDF = async (periodRows: DepenseRow[], periodLabel?: string) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      
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
      doc.text("RAPPORT DES DÉPENSES", pageWidth / 2, titleY, { align: "center" });
      
      // Zone infos comme dans le reçu d'achat : Nom et Tel sous le titre
      let infoY = titleY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");

      // "Nom :" à gauche
      doc.text("Nom :", margin, infoY);

      // "Tel :" sur la même ligne, mais légèrement reculé pour laisser de la place au numéro
      const telLabel = "Tel :";
      const telLabelWidth = doc.getTextWidth(telLabel);
      const telOffset = 40; // espace pour écrire le numéro à droite
      doc.text(telLabel, pageWidth - margin - telLabelWidth - telOffset, infoY);

      infoY += 8;

      // Informations de période (dates seulement), centrées sous Nom/Tel
      doc.setFont("helvetica", "normal");
      if (periodLabel) {
        doc.text(periodLabel, pageWidth / 2, infoY, { align: "center" });
        infoY += 8;
      }
      
      // Préparer les données du tableau
      const tableData = periodRows.map((row, index) => [
        (index + 1).toString(),
        formatDateDisplay(row.date),
        row.nom_depense || "-",
        formatNumber(row.somme || 0) + " F"
      ]);
      
      // Calculer le total
      const total = periodRows.reduce((sum, row) => sum + (row.somme || 0), 0);
      // Mettre "TOTAL" et la valeur dans la même colonne (colonne Somme)
      tableData.push(["", "", "", "TOTAL " + formatNumber(total) + " F"]);
      
      const totalRowIndex = tableData.length - 1;
      
      autoTable(doc, {
        startY: infoY + 4,
        head: [["N°", "Date", "Nom de la dépense", "Somme"]],
        body: tableData,
        theme: "grid",
        headStyles: { 
          fillColor: [255, 255, 255], 
          textColor: [0, 0, 0], 
          fontStyle: "bold", 
          fontSize: 11,
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          cellPadding: 4
        },
        styles: { 
          fontSize: 10, 
          cellPadding: 4, 
          textColor: [0, 0, 0],
          lineWidth: 0.5,
          lineColor: [0, 0, 0]
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },  // N°
          1: { cellWidth: 40, halign: 'left' },    // Date
          2: { cellWidth: 90, halign: 'left' },     // Nom
          3: { cellWidth: 45, halign: 'right' },    // Somme (augmenté pour contenir "TOTAL" + valeur)
        },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        didParseCell: (data: any) => {
          // Mettre en gras la ligne de total
          if (data.row.index === totalRowIndex) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.textColor = [0, 0, 0];
            // Pour la colonne Somme (index 3), aligner à droite
            if (data.column.index === 3) {
              data.cell.styles.halign = 'right';
            }
          }
        },
        didDrawPage: () => {
          // Pied de page - s'assurer qu'il est toujours visible
          const footerY = pageHeight - 22;
          doc.setFontSize(13); // Taille de police pour la date à compléter manuellement
          doc.setFont("helvetica", "normal");
          // Afficher les deux lignes verticalement (l'une sous l'autre)
          const leftFooterBurkina = "Burkina le __ / __ / 2026";
          const leftFooterMali = "Mali le __ / __ / 2026";
          doc.text(leftFooterBurkina, margin, footerY);
          doc.text(leftFooterMali, margin, footerY + 10);
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13); // Augmentation de la taille de police
          const rightFooter = "SIGNATURE DU PDG DE KSS";
          const rightFooterWidth = doc.getTextWidth(rightFooter);
          doc.text(rightFooter, pageWidth - margin - rightFooterWidth, footerY);
        },
      });
      
      // Nom du fichier
      const fileName = periodLabel 
        ? `depenses_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        : `depenses.pdf`;

      // Télécharger le PDF directement
      doc.save(fileName);
      
      toast({
        title: "Succès !",
        description: "PDF téléchargé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la génération du PDF",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (stopIndex?: number) => {
    setIsDownloading(true);
    try {
      // Calculer les dépenses de la période à télécharger
      let periodRows: DepenseRow[] = [];
      let periodLabel = "";
      
      if (stopIndex !== undefined) {
        // Télécharger une période spécifique (arrêtée)
        const savedRows = rows.filter(r => r.isSaved && r.savedId);
        // Trouver la dernière ligne "FIN DE COMPTE" avant ce stopIndex
        const periodStops = savedRows.filter(r => r.isPeriodStop && r.savedId && r.savedId < stopIndex);
        const lastPeriodStopId = periodStops.length > 0 
          ? Math.max(...periodStops.map(r => r.savedId!))
          : 0;
        
        // Prendre toutes les dépenses entre le dernier arrêt et ce stopIndex
        periodRows = savedRows.filter(r => 
          !r.isPeriodStop && 
          r.savedId && 
          r.savedId > lastPeriodStopId && 
          r.savedId <= stopIndex
        );
        
        // Trouver la ligne "FIN DE COMPTE" correspondante pour le label
        const periodStopRow = savedRows.find(r => r.isPeriodStop && r.savedId === stopIndex);
      } else {
        // Télécharger la période actuelle (non arrêtée)
        periodRows = getCurrentPeriodDepenses();
      }
      
      if (periodRows.length === 0) {
        toast({
          title: "Aucune dépense",
          description: "Aucune dépense à exporter pour cette période",
          variant: "destructive",
        });
        return;
      }
      
      // Calculer les dates pour le label (sans le mot "Période")
      const dates = periodRows
        .map(r => {
          if (!r.date) return null;
          try {
            if (typeof r.date === 'string' && r.date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
              const parts = r.date.split('/');
              return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
            return new Date(r.date);
          } catch (e) {
            return null;
          }
        })
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()));
      
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        const minDateStr = minDate.toLocaleDateString('fr-FR');
        const maxDateStr = maxDate.toLocaleDateString('fr-FR');
        if (minDateStr === maxDateStr) {
          periodLabel = `Période : ${minDateStr}`;
        } else {
          periodLabel = `Période : ${minDateStr} - ${maxDateStr}`;
        }
      } else {
        periodLabel = "";
      }
      
      await generatePDF(periodRows, periodLabel);
    } catch (error: any) {
      console.error("Erreur lors du téléchargement du PDF:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de télécharger le PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const periodTotal = calculatePeriodTotal();
  const total = calculateTotal();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 mb-4">
          <PageHeader
            title="Dépenses"
            icon={Receipt}
            action={
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleStopPeriod}
                  disabled={isStopping || rows.length === 0}
                  className="gap-2"
                >
                  {isStopping ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Arrêt en cours...
                    </>
                  ) : (
                    <>
                      <StopCircle size={16} />
                      Arrêter le compte
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSaving || rows.filter(r => !r.isSaved && !r.isPeriodStop).length === 0}
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
                <Button 
                  variant="secondary" 
                  onClick={() => navigate(-1)}
                  className="gap-2"
                >
                  <ArrowLeft size={16} />
                  Retour
                </Button>
              </div>
            }
          />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {isLoading ? (
            <div className="bg-card rounded-xl border border-border p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Chargement des dépenses...</span>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex-1 flex flex-col min-h-0 h-full">
              <div ref={tableContainerRef} className="overflow-auto flex-1 min-h-0 h-full">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted sticky top-0 z-20">
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-center font-semibold text-xl text-card-foreground w-[50px] bg-muted">
                        N°
                      </th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[120px] bg-muted">
                        Date
                      </th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[250px] bg-muted">
                        Nom dépense
                      </th>
                      <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[180px] bg-muted">
                        Somme dépense
                      </th>
                      <th className="px-0.5 py-2 text-center font-semibold text-xl text-card-foreground w-7 bg-muted">
                        #
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          Aucune dépense enregistrée. Cliquez sur "Nouvelle ligne"
                          pour ajouter une ligne.
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const organizedRows = organizeRowsWithPeriodStops();
                        let rowIndex = 0;
                        
                        return organizedRows.map((item, index) => {
                          // Si c'est une ligne de fin de période, réinitialiser le compteur
                          if (item.type === 'period-stop') {
                            rowIndex = 0; // Réinitialiser pour la prochaine période
                          }
                          
                          if (item.type === 'depense' && item.row) {
                            rowIndex++;
                            const row = item.row;
                            return (
                              <tr
                                key={row.id}
                                className={`border-t border-gray-400 dark:border-gray-600 transition-colors ${
                                  row.isSaved 
                                    ? "bg-muted/10 hover:bg-muted/20" 
                                    : "hover:bg-muted/20"
                                }`}
                              >
                                <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center font-medium text-2xl text-foreground">
                                  {rowIndex}
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                                  <Input
                                    type="text"
                                    value={row.isSaved ? formatDateDisplay(row.date) : (row.date || "")}
                                    onChange={(e) => updateCell(row.id, "date", e.target.value)}
                                    onBlur={(e) => {
                                      if (!e.target.value.trim()) {
                                        updateCell(row.id, "date", getTodayDate());
                                      }
                                    }}
                                    placeholder={getTodayDate()}
                                    className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground disabled:opacity-100 disabled:cursor-default"
                                    style={{ fontSize: '1.25rem' }}
                                    disabled={row.isSaved || row.isPeriodStop}
                                  />
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                                  <Input
                                    type="text"
                                    value={row.nom_depense || ""}
                                    onChange={(e) => updateCell(row.id, "nom_depense", e.target.value)}
                                    placeholder="Nom de la dépense"
                                    className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground disabled:opacity-100 disabled:cursor-default"
                                    style={{ fontSize: '1.5rem' }}
                                    disabled={row.isSaved || row.isPeriodStop}
                                  />
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                                  <div className="flex items-center gap-1 px-1">
                                    <Input
                                      type="text"
                                      value={row.somme !== null && row.somme !== undefined ? formatNumber(row.somme) : ""}
                                      onChange={(e) => {
                                        const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                        const num = cleaned === "" ? null : Number(cleaned);
                                        updateCell(row.id, "somme", isNaN(num as number) ? null : num);
                                      }}
                                      className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 text-right font-medium text-foreground flex-1 disabled:opacity-100 disabled:cursor-default"
                                      style={{ fontSize: '1.5rem' }}
                                      placeholder="0"
                                      disabled={row.isSaved || row.isPeriodStop}
                                    />
                                    {row.somme !== null && row.somme !== undefined && row.somme > 0 && (
                                      <span className="text-xl font-medium text-foreground">F</span>
                                    )}
                                  </div>
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center">
                                  {!row.isPeriodStop && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteClick(row.id)}
                                      disabled={isDepenseInStoppedPeriod(row)}
                                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={isDepenseInStoppedPeriod(row) ? "Impossible de supprimer une dépense d'une période déjà arrêtée" : "Supprimer cette ligne"}
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          } else if (item.type === 'period-stop' && item.row) {
                            const row = item.row;
                            return (
                              <tr
                                key={`period-stop-${item.periodIndex || row.id}`}
                                className="border-t-2 border-red-600 dark:border-red-400 bg-red-50 dark:bg-red-950/30"
                              >
                                <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-center text-lg text-red-700 dark:text-red-400">
                                  -
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-center text-lg text-red-700 dark:text-red-400">
                                  {row.nom_depense && row.nom_depense.startsWith("FIN DE COMPTE") ? "FIN DE COMPTE" : (row.nom_depense || "FIN DE COMPTE")}
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-2"></td>
                                <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right text-xl text-red-700 dark:text-red-400">
                                  <span className="block w-full text-right">
                                    {formatNumber(item.periodTotal || row.somme || 0)}{" "}
                                    <span className="text-base">F</span>
                                  </span>
                                </td>
                                <td className="px-1 py-2 text-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadPDF(item.stopIndex)}
                                    disabled={isDownloading}
                                    className="gap-1 h-7 text-xs"
                                  >
                                    <Download size={12} />
                                    PDF
                                  </Button>
                                </td>
                              </tr>
                            );
                          }
                          return null;
                        });
                      })()
                    )}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot className="border-t-4 border-dashed border-gray-500 dark:border-gray-400">
                      <tr className="bg-muted/50">
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3"></td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3"></td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3"></td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3 text-right font-bold text-xl text-card-foreground bg-muted/20">
                          <span className="block w-full text-right">
                            TOTAL {formatNumber(periodTotal)}{" "}
                            <span className="text-base">F</span>
                          </span>
                        </td>
                        <td className="px-1 py-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
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

      {/* Modal de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette dépense ?
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
