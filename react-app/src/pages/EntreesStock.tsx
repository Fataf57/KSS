import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Package, Plus, Trash2, Save, Loader2, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config/api";

interface EntreeStockRow {
  id: number;
  date: string;
  type_operation: 'entree' | 'sortie' | ''; // Type d'opération
  nom_fournisseur: string;
  type_denree: string;
  nombre_sacs: number;
  poids_par_sac: number;
  tonnage_total: number;
  numero_magasin: string;
  isSaved?: boolean; // Indique si la ligne a été enregistrée
  savedId?: number; // ID de l'entrée dans la base de données si enregistrée
}
const STORAGE_KEY = "stock_entries_rows";

const TYPES_DENREE_PREDEFINIS = ["Anacarde", "Karité", "Sesame", "Soza", "Mais"];

const MOIS_FRANCAIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

// Fonction pour obtenir le mois d'une date (ex: "Janvier 2026")
const getMonthFromDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const month = date.getMonth();
  const year = date.getFullYear();
  return `${MOIS_FRANCAIS[month]} ${year}`;
};

// Fonction pour formater la date au format "jj/mm/aaaa" (ex: "12/03/2026")
const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

export default function EntreesStock() {
  const [rows, setRows] = useState<EntreeStockRow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Charger l'historique depuis l'API
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(getApiUrl("stock-entries/"));
      if (!response.ok) {
        throw new Error("Erreur lors du chargement de l'historique");
      }
      const data = await response.json();

      // Construire la liste des opérations annulées (et de leurs écritures d'annulation)
      const cancelledOriginalIds = new Set<number>();

      data.forEach((entry: any) => {
        if (typeof entry.notes === "string" && entry.notes.startsWith("Annulation de l'opération #")) {
          const match = entry.notes.match(/#(\d+)/);
          if (match) {
            cancelledOriginalIds.add(Number(match[1]));
          }
        }
      });

      // Ne garder dans l'historique que les opérations "actives" :
      //  - on enlève les lignes d'annulation
      //  - on enlève aussi les opérations d'origine qui ont été annulées
      const visibleData = data.filter((entry: any) => {
        const isCancellation =
          typeof entry.notes === "string" &&
          entry.notes.startsWith("Annulation de l'opération #");
        const isCancelledOriginal = cancelledOriginalIds.has(entry.id);
        return !isCancellation && !isCancelledOriginal;
      });

      // Convertir les données de l'API en format EntreeStockRow
      // Utiliser des IDs négatifs pour l'historique pour éviter les conflits avec les nouvelles lignes
      const historyRows: EntreeStockRow[] = visibleData.map((entry: any) => ({
        id: -entry.id, // ID négatif pour l'historique
        date: entry.date,
        type_operation: entry.type_operation || 'entree',
        nom_fournisseur: entry.nom_fournisseur || "",
        type_denree: entry.type_denree,
        nombre_sacs: entry.nombre_sacs,
        poids_par_sac: Number(entry.poids_par_sac),
        tonnage_total: Number(entry.tonnage_total),
        numero_magasin: entry.numero_magasin,
        isSaved: true,
        savedId: entry.id,
      }));

      // Charger les lignes non Enregistrées depuis localStorage
      const savedRows = localStorage.getItem(STORAGE_KEY);
      let unsavedRows: EntreeStockRow[] = [];
      if (savedRows) {
        try {
          const parsedRows = JSON.parse(savedRows);
          // S'assurer que chaque ligne a un type_operation (pour compatibilité avec les anciennes données)
          unsavedRows = parsedRows
            .map((r: EntreeStockRow) => ({
              ...r,
              type_operation: r.type_operation || 'entree' as 'entree' | 'sortie'
            }))
            .filter((r: EntreeStockRow) => !r.isSaved); // Ne garder que les lignes non Enregistrées
          
          // Calculer le prochain ID (seulement basé sur les lignes non Enregistrées car l'historique utilise des IDs négatifs)
          const maxId = unsavedRows.length > 0 
            ? Math.max(...unsavedRows.map((r: EntreeStockRow) => r.id))
            : 0;
          setNextId(Math.max(maxId, 0) + 1);
        } catch (error) {
          console.error("Erreur lors du chargement des données:", error);
        }
      } else {
        // Si pas de localStorage, nextId commence à 1 (les lignes historiques utilisent des IDs négatifs)
        setNextId(1);
      }

      // Combiner l'historique avec les lignes non Enregistrées
      setRows([...historyRows, ...unsavedRows]);
    } catch (error: any) {
      console.error("Erreur lors du chargement de l'historique:", error);
      // En cas d'erreur, charger seulement depuis localStorage
    const savedRows = localStorage.getItem(STORAGE_KEY);
    if (savedRows) {
      try {
        const parsedRows = JSON.parse(savedRows);
          const rowsWithType = parsedRows.map((r: EntreeStockRow) => ({
            ...r,
            type_operation: r.type_operation || 'entree' as 'entree' | 'sortie'
          }));
          setRows(rowsWithType);
          const maxId = rowsWithType.length > 0 
            ? Math.max(...rowsWithType.map((r: EntreeStockRow) => r.id))
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

  // Charger les données au montage
  useEffect(() => {
    fetchHistory();
  }, []);

  // Recharger l'historique après une Enregistrement ou suppression
  useEffect(() => {
    const handleStockUpdate = () => {
      fetchHistory();
    };
    window.addEventListener('stock-updated', handleStockUpdate);
    return () => window.removeEventListener('stock-updated', handleStockUpdate);
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

  const updateCell = (id: number, field: keyof EntreeStockRow, value: string | number) => {
    setRows(prevRows => prevRows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        // Calcul automatique du tonnage total
        if (field === "nombre_sacs" || field === "poids_par_sac") {
          updated.tonnage_total = Number(updated.nombre_sacs) * Number(updated.poids_par_sac);
        }
        return updated;
      }
      return row;
    }));
  };

  const addRow = () => {
    const newRow: EntreeStockRow = {
      id: nextId,
      date: new Date().toISOString().split('T')[0],
      type_operation: '', // Par défaut, vide
      nom_fournisseur: "",
      type_denree: "",
      nombre_sacs: 0,
      poids_par_sac: 0,
      tonnage_total: 0,
      numero_magasin: "2",
      isSaved: false,
    };
    setRows([...rows, newRow]);
    setNextId(nextId + 1);
  };

  const cancelRow = async (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row || !row.isSaved || !row.savedId) return;

    try {
      // Supprimer directement l'opération côté API pour annuler complètement la ligne
      const response = await fetch(getApiUrl(`stock-entries/${row.savedId}/`), {
        method: "DELETE",
      });

      if (!response.ok) {
        let errorMessage = "Erreur lors de l'annulation";
        try {
          const errorData = await response.json();
          if (errorData.non_field_errors) {
            errorMessage = Array.isArray(errorData.non_field_errors) 
              ? errorData.non_field_errors.join(", ")
              : errorData.non_field_errors;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
            }
          } catch (e) {
          // Utiliser le message par défaut
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Succès",
        description: "Ligne supprimée avec succès",
      });
      
      // Supprimer complètement la ligne de l'état (elle disparaît de la liste)
      setRows(prevRows => prevRows.filter(r => r.id !== id));
      
      // Recharger l'historique pour que les détails du stock se mettent à jour
      window.dispatchEvent(new Event('stock-updated'));
      fetchHistory();
      } catch (error: any) {
      console.error("Erreur lors de l'annulation:", error);
        toast({
          title: "Erreur",
        description: error.message || "Impossible d'annuler la ligne",
          variant: "destructive",
        });
    }
  };

  const handleDeleteClick = (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    // Seulement permettre la suppression si la ligne n'est pas enregistrée
    if (!row.isSaved) {
      setRowToDelete(id);
      setDeleteDialogOpen(true);
    }
  };

  const deleteRow = (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    // Seulement supprimer si la ligne n'est pas enregistrée
    if (!row.isSaved) {
      setRows(prevRows => prevRows.filter(row => row.id !== id));
      setDeleteDialogOpen(false);
      setRowToDelete(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (rowToDelete !== null) {
      deleteRow(rowToDelete);
    }
  };

  const validateRow = (row: EntreeStockRow): string | null => {
    // Permettre l'enregistrement si la ligne est complètement vide
    const isRowEmpty = !row.date && !row.type_operation && !row.nom_fournisseur?.trim() && 
                       !row.type_denree?.trim() && (!row.nombre_sacs || row.nombre_sacs <= 0) && 
                       (!row.poids_par_sac || row.poids_par_sac <= 0) && !row.numero_magasin;
    if (isRowEmpty) return null;
    
    // Si au moins un champ est rempli, valider les champs requis
    if (!row.date) return "La date est requise";
    if (!row.type_operation) return "Le type d'opération est requis";
    if (!row.type_denree.trim()) return "Le type de denrée est requis";
    if (row.nombre_sacs <= 0) return "Le nombre de sacs doit être supérieur à 0";
    if (row.poids_par_sac <= 0) return "Le poids par sac doit être supérieur à 0";
    if (!row.numero_magasin) return "Le magasin est requis";
    return null;
  };

  const handleSave = async () => {
    // Ne traiter que les lignes non enregistrées
    const rowsToSave = rows.filter(r => !r.isSaved);

    // Valider uniquement les nouvelles lignes
    const errors: string[] = [];
    rowsToSave.forEach((row) => {
      const error = validateRow(row);
      if (error) {
        // On utilise l'index d'affichage dans organizedRows pour le message, mais ici on garde simple
        errors.push(`Ligne avec produit "${row.type_denree}": ${error}`);
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

    if (rowsToSave.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Aucune nouvelle ligne à enregistrer",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Enregistrer chaque ligne
      const savePromises = rowsToSave.map(async (row) => {
        const payload = {
          date: row.date,
          type_operation: row.type_operation,
          nom_fournisseur: row.nom_fournisseur || "",
          type_denree: row.type_denree,
          nombre_sacs: row.nombre_sacs,
          poids_par_sac: row.poids_par_sac,
          numero_magasin: row.numero_magasin,
          notes: "",
        };

        const response = await fetch(getApiUrl("stock-entries/"), {
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
            // Gérer les erreurs de validation Django (qui peuvent être dans non_field_errors ou comme un dict)
            if (errorData.non_field_errors) {
              errorMessage = Array.isArray(errorData.non_field_errors) 
                ? errorData.non_field_errors.join(", ")
                : errorData.non_field_errors;
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (typeof errorData === 'object') {
              // Si c'est un objet avec des clés (erreurs de validation de champs)
              const errorMessages = Object.entries(errorData).map(([key, value]) => {
                if (Array.isArray(value)) {
                  return `${key}: ${value.join(", ")}`;
                }
                return `${key}: ${value}`;
              });
              errorMessage = errorMessages.join("\n");
            }
          } catch (e) {
            // Si on ne peut pas parser le JSON, utiliser le message d'erreur par défaut
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        return response.json();
      });

      await Promise.all(savePromises);

      // Nettoyer le stockage local : les lignes viennent maintenant de l'API
      localStorage.removeItem(STORAGE_KEY);

      toast({
        title: "Succès !",
        description: `${rowsToSave.length} opération(s) de stock enregistrée(s) avec succès`,
      });

      // Recharger l'historique pour afficher les lignes enregistrées
      window.dispatchEvent(new Event('stock-updated'));
      await fetchHistory();
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

  // Organiser les lignes par mois (retourne juste les lignes avec info sur le mois)
  const organizeRowsByMonth = () => {
    if (rows.length === 0) return [];
    
    // Trier les lignes : d'abord les enregistrées (par savedId), puis les non enregistrées (par id)
    // Cela garantit que les nouvelles lignes apparaissent toujours à la fin
    const sortedRows = [...rows].sort((a, b) => {
      // Séparer les lignes enregistrées des non enregistrées
      if (a.isSaved && b.isSaved) {
        // Les deux sont enregistrées : trier par savedId
        return (a.savedId || 0) - (b.savedId || 0);
      } else if (!a.isSaved && !b.isSaved) {
        // Les deux ne sont pas enregistrées : trier par id
        return a.id - b.id;
      } else {
        // Mélange de lignes enregistrées et non enregistrées
        // Les lignes enregistrées viennent toujours avant les non enregistrées
        if (a.isSaved && !b.isSaved) {
          return -1; // a vient avant b
        } else {
          return 1; // b vient avant a
        }
      }
    });
    
    const organized: Array<{ row: EntreeStockRow; month?: string; showMonth?: boolean }> = [];
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
      <datalist id="types-denree">
        {TYPES_DENREE_PREDEFINIS.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 mb-4">
          <PageHeader
            title="Magasin"
            description=""
            icon={Package}
            action={
              <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                // Forcer le rechargement de la page de détails
                navigate("/detail-stock");
                // Déclencher un événement personnalisé pour forcer le rafraîchissement
                window.dispatchEvent(new Event('stock-updated'));
              }}
              className="gap-2"
            >
              <Eye size={16} />
              Voir les Magasin
            </Button>
                <Button 
                  variant="secondary" 
                  onClick={handleSave} 
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white hover:text-white"
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
                <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground w-[180px] bg-muted">Date</th>
                <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[150px] bg-muted">Type</th>
                <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[250px] bg-muted">Client</th>
                <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[200px] bg-muted">Nom Produit</th>
                <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[100px] bg-muted">Nbr sac</th>
                <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[120px] bg-muted">Poid sac</th>
                <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[180px] bg-muted">Tonnage</th>
                <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[150px] bg-muted">Magasin</th>
                <th className="px-0.5 py-2 text-center font-semibold text-xl text-card-foreground w-7 bg-muted">#</th>
              </tr>
            </thead>
            <tbody>
              {organizedRows.map((item, index) => {
                const row = item.row;
                
                return (
                  <tr 
                    key={row.id} 
                    className={`border-t border-gray-400 dark:border-gray-600 transition-colors ${
                      row.isSaved 
                        ? row.type_operation === 'sortie' 
                          ? "bg-red-200 dark:bg-red-900/40 hover:bg-red-300 dark:hover:bg-red-900/50"
                          : "bg-muted/10 hover:bg-muted/20"
                        : row.type_operation === 'sortie'
                          ? "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40"
                          : "hover:bg-muted/20"
                    }`}
                  >
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <Input
                      type="text"
                      value={row.isSaved ? formatDateDisplay(row.date) : row.date}
                      onChange={(e) => updateCell(row.id, "date", e.target.value)}
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-lg md:text-lg font-medium text-foreground disabled:opacity-100 disabled:cursor-default"
                      disabled={row.isSaved}
                    />
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                      <Select
                        value={row.type_operation || ''}
                        onValueChange={(value) => updateCell(row.id, "type_operation", value as 'entree' | 'sortie')}
                        disabled={row.isSaved}
                      >
                        <SelectTrigger className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default" disabled={row.isSaved}>
                        <SelectValue placeholder="" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entree">Entrée</SelectItem>
                        <SelectItem value="sortie">Sortie</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <Input
                      type="text"
                      value={row.nom_fournisseur}
                      onChange={(e) => updateCell(row.id, "nom_fournisseur", e.target.value)}
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default"
                      disabled={row.isSaved}
                    />
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <Input
                      type="text"
                      list="types-denree"
                      value={row.type_denree}
                      onChange={(e) => updateCell(row.id, "type_denree", e.target.value)}
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default"
                      disabled={row.isSaved}
                    />
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <Input
                      type="number"
                      value={row.nombre_sacs || ""}
                      onChange={(e) => updateCell(row.id, "nombre_sacs", Number(e.target.value))}
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      min="0"
                      disabled={row.isSaved}
                    />
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <div className="flex items-center gap-1 px-1">
                      <Input
                        type="number"
                        value={row.poids_par_sac || ""}
                        onChange={(e) => updateCell(row.id, "poids_par_sac", Number(e.target.value))}
                        className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground flex-1 disabled:opacity-100 disabled:cursor-default [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        min="0"
                        step="0.01"
                        disabled={row.isSaved}
                      />
                      <span className="text-base font-medium text-foreground">kg</span>
                    </div>
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-right font-medium text-xl text-foreground bg-muted/20">
                    <span className="block w-full text-right text-lg">
                      {row.tonnage_total.toLocaleString()} <span className="text-base">kg</span>
                    </span>
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                    <Select
                      value={row.numero_magasin}
                      onValueChange={(value) => updateCell(row.id, "numero_magasin", value)}
                      disabled={row.isSaved}
                    >
                      <SelectTrigger className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default" disabled={row.isSaved}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Djaradougou</SelectItem>
                        <SelectItem value="2">Ouezzin-ville</SelectItem>
                        <SelectItem value="3">Bamako</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {!row.isSaved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(row.id)}
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                      {!row.isSaved ? null : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cancelRow(row.id)}
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Supprimer cette ligne (restaure le stock)"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
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
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-card-foreground mb-2">
                Aucune opération de stock
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Cliquez sur "Nouvelle ligne" pour commencer à enregistrer des entrées ou sorties de stock
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
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}