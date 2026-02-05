import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users, Plus, Trash2, Save, Loader2, ArrowLeft } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";

interface EmployeeExpenseRow {
  id: number;
  date: string;
  employee: string;
  somme_remise: number | null;
  nom_depense: string | null;
  somme_depense: number | null;
  somme_restante: number | null;
  isSaved?: boolean;
  savedId?: number;
  employeeId?: number; // ID de l'employé dans la base de données
}

const getStorageKey = (employeeId?: string) => 
  employeeId ? `employee_expenses_rows_${employeeId}` : "employee_expenses_rows";

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

// Fonction pour trier les lignes par ordre d'insertion (comme dans SuiviClients)
const sortRowsByInsertionOrder = (rows: EmployeeExpenseRow[]): EmployeeExpenseRow[] => {
  return [...rows].sort((a, b) => {
    if (a.isSaved && b.isSaved) {
      // Pour les lignes enregistrées, utiliser savedId (ID de la base = ordre d'insertion)
      return (a.savedId || 0) - (b.savedId || 0);
    }
    if (a.isSaved && !b.isSaved) {
      // Les lignes enregistrées avant les non enregistrées
      return -1;
    }
    if (!a.isSaved && b.isSaved) {
      // Les lignes enregistrées avant les non enregistrées
      return 1;
    }
    // Pour les lignes non enregistrées, utiliser id (ordre de création côté frontend)
    return a.id - b.id;
  });
};

// Fonction pour formater la date au format "jj/mm/aaaa" (ex: "12/03/2026")
const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return "";
  // Si la date est déjà au format "jj/mm/aaaa", la retourner telle quelle
  if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return dateString;
  }
  try {
    // Essayer de parser la date (peut être ISO ou autre format)
    let date: Date;
    if (dateString.includes('T') || dateString.includes('-')) {
      // Format ISO ou date avec tirets
      date = new Date(dateString);
    } else {
      // Essayer de parser comme jj/mm/aaaa
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

export default function SuiviEmployes() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [rows, setRows] = useState<EmployeeExpenseRow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [employees, setEmployees] = useState<Array<{id: number, full_name: string}>>([]);
  const [currentEmployee, setCurrentEmployee] = useState<{id: number, full_name: string} | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token } = useAuth();

  // Charger les employés depuis l'API
  useEffect(() => {
    setIsLoadingEmployees(true);
    const fetchEmployees = async () => {
      try {
        const response = await fetch(getApiUrl("employees/"), {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
          
          // Si un employeeId est fourni, charger cet employé
          if (employeeId) {
            const employee = data.find((e: {id: number}) => e.id.toString() === employeeId);
            if (employee) {
              setCurrentEmployee(employee);
            } else {
              toast({
                title: "Erreur",
                description: "Employé introuvable",
                variant: "destructive",
              });
              setTimeout(() => {
                navigate("/liste-employes");
              }, 1000);
            }
          } else {
            // Si pas d'employeeId, ne pas définir currentEmployee
            setCurrentEmployee(null);
          }
        } else {
          throw new Error("Erreur lors du chargement des employés");
        }
      } catch (error) {
        console.error("Erreur lors du chargement des employés:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les employés",
          variant: "destructive",
        });
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, [employeeId, navigate, toast, token]);

  // Charger les dépenses depuis l'API et localStorage
  useEffect(() => {
    if (!employeeId || !currentEmployee) return;
    
    const loadExpenses = async () => {
      try {
        // Charger depuis l'API
        const response = await fetch(getApiUrl(`employee-expenses/?employee=${employeeId}`));
        if (response.ok) {
          const apiData = await response.json();
          const apiRows: EmployeeExpenseRow[] = apiData.map((item: any) => ({
            id: item.id + 100000, // ID élevé pour éviter les conflits
            date: item.date,
            employee: currentEmployee.full_name,
            somme_remise: item.somme_remise ? parseFloat(item.somme_remise) : null,
            nom_depense: item.nom_depense ?? null,
            somme_depense: item.somme_depense ? parseFloat(item.somme_depense) : null,
            somme_restante: item.somme_restante ? parseFloat(item.somme_restante) : null,
            isSaved: true,
            savedId: item.id,
            employeeId: currentEmployee.id,
          }));
          
          // Charger depuis localStorage (seulement les lignes non enregistrées)
          const storageKey = getStorageKey(employeeId);
          const savedRows = localStorage.getItem(storageKey);
          let localRows: EmployeeExpenseRow[] = [];
          
          if (savedRows) {
            try {
              const parsed = JSON.parse(savedRows);
              // Ne garder que les lignes non enregistrées pour éviter les doublons
              localRows = parsed.filter((r: EmployeeExpenseRow) => !r.isSaved);
            } catch (error) {
              console.error("Erreur lors du chargement des données locales:", error);
            }
          }
          
          // Combiner les deux sources (API + localStorage non enregistrées)
          const allRows = [...apiRows, ...localRows];
          
          // Trier les lignes par ordre d'insertion (savedId pour les enregistrées, id pour les non enregistrées)
          const orderedRows = sortRowsByInsertionOrder(allRows);
          
          // Recalculer les sommes restantes de manière cumulative (cela préservera l'ordre)
          setRows(recalculateSommeRestante(orderedRows));
          
          const maxId = allRows.length > 0 
            ? Math.max(...allRows.map((r: EmployeeExpenseRow) => r.id))
            : 0;
          setNextId(maxId + 1);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des dépenses:", error);
      }
    };
    
    loadExpenses();
  }, [employeeId, currentEmployee]);

  // Enregistrer dans localStorage seulement les lignes non enregistrées
  useEffect(() => {
    if (employeeId) {
      const storageKey = getStorageKey(employeeId);
      const unsavedRows = rows.filter(r => !r.isSaved);
      if (unsavedRows.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(unsavedRows));
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, [rows, employeeId]);

  // Fonction pour recalculer toutes les sommes restantes de manière cumulative
  const recalculateSommeRestante = (rowsToCalculate: EmployeeExpenseRow[]): EmployeeExpenseRow[] => {
    // Préserver l'ordre d'insertion : ne pas trier, garder l'ordre tel quel
    // Les lignes enregistrées doivent rester dans leur ordre d'insertion
    // Les lignes non enregistrées doivent rester à leur position d'ajout (généralement en bas)
    const sortedRows = [...rowsToCalculate];

    // Calculer la somme restante de manière cumulative
    // Formule : somme_restante_précédente + somme_remise - somme_depense
    let somme_restante_precedente = 0;
    return sortedRows.map(row => {
      const somme_remise = row.somme_remise !== null ? Number(row.somme_remise) : 0;
      const somme_depense = row.somme_depense !== null ? Number(row.somme_depense) : 0;
      
      // Formule : somme_restante_précédente + somme_remise - somme_depense
      const somme_restante = somme_restante_precedente + somme_remise - somme_depense;
      somme_restante_precedente = somme_restante;
      
      return { ...row, somme_restante };
    });
  };

  const updateCell = (id: number, field: keyof EmployeeExpenseRow, value: string | number | null) => {
    setRows(prevRows => {
      // Mettre à jour la ligne modifiée
      const updatedRows = prevRows.map(row => {
        if (row.id === id) {
          // Convertir les valeurs vides en null
          const updatedValue = value === "" || value === null || value === undefined 
            ? null 
            : (typeof value === "string" ? value : value);
          
          return { ...row, [field]: updatedValue };
        }
        return row;
      });
      
      // Recalculer toutes les sommes restantes de manière cumulative
      return recalculateSommeRestante(updatedRows);
    });
  };

  const addRow = () => {
    if (!currentEmployee) {
      toast({
        title: "Erreur",
        description: "Aucun employé sélectionné",
        variant: "destructive",
      });
      return;
    }

    const newRow: EmployeeExpenseRow = {
      id: nextId,
      date: getTodayDate(),
      employee: currentEmployee.full_name,
      somme_remise: null,
      nom_depense: null,
      somme_depense: null,
      somme_restante: null,
      isSaved: false,
      employeeId: currentEmployee.id,
    };
    const updatedRows = [...rows, newRow];
    // Recalculer toutes les sommes restantes après ajout
    setRows(recalculateSommeRestante(updatedRows));
    setNextId(nextId + 1);
  };

  const handleDeleteClick = (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    setRowToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (rowToDelete !== null) {
      await deleteRow(rowToDelete);
      setDeleteDialogOpen(false);
      setRowToDelete(null);
    }
  };

  const deleteRow = async (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    if (row.isSaved && row.savedId) {
      try {
        const response = await fetch(getApiUrl(`employee-expenses/${row.savedId}/`), {
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
        
        const updatedRows = rows.filter(row => row.id !== id);
        // Recalculer toutes les sommes restantes après suppression
        setRows(recalculateSommeRestante(updatedRows));
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message || "Impossible de supprimer la dépense",
          variant: "destructive",
        });
        return;
      }
    } else {
      const updatedRows = rows.filter(row => row.id !== id);
      // Recalculer toutes les sommes restantes après suppression
      setRows(recalculateSommeRestante(updatedRows));
    }
  };

  // Fonction pour convertir une date au format ISO (YYYY-MM-DD)
  const convertDateToISO = (dateString: string): string => {
    if (!dateString) return "";
    // Si la date est déjà au format ISO, la retourner telle quelle
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    // Si la date est au format "jj/mm/aaaa", la convertir
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parts = dateString.split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // Sinon, essayer de parser la date
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

  const validateRow = (row: EmployeeExpenseRow): string | null => {
    // Permettre l'enregistrement si la ligne est complètement vide
    const isRowEmpty = !row.date && !row.employee && 
                       (row.somme_remise === null || row.somme_remise === undefined || row.somme_remise === 0) &&
                       !row.nom_depense?.trim() && 
                       (row.somme_depense === null || row.somme_depense === undefined || row.somme_depense === 0);
    if (isRowEmpty) return null;
    
    // Si au moins un champ est rempli, valider les champs requis
    if (!row.date) return "La date est requise";
    return null;
  };

  const handleSave = async () => {
    if (!currentEmployee) {
      toast({
        title: "Erreur",
        description: "Aucun employé sélectionné",
        variant: "destructive",
      });
      return;
    }

    // Valider toutes les lignes non enregistrées
    const rowsToSave = rows.filter(r => !r.isSaved);
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
      // Enregistrer chaque ligne
      const savePromises = rowsToSave.map(async (row) => {
        // Convertir la date au format ISO pour l'API
        const dateISO = convertDateToISO(row.date);
        
        const payload = {
          date: dateISO,
          employee: currentEmployee.id,
          somme_remise: row.somme_remise ?? 0,
          nom_depense: row.nom_depense ?? "",
          somme_depense: row.somme_depense ?? 0,
          notes: "",
        };

        const response = await fetch(getApiUrl("employee-expenses/"), {
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

      await Promise.all(savePromises);

      toast({
        title: "Succès !",
        description: `${rowsToSave.length} dépense(s) enregistrée(s) avec succès`,
      });

      // Nettoyer immédiatement le localStorage pour éviter les doublons
      if (employeeId) {
        const storageKey = getStorageKey(employeeId);
        // Retirer les lignes qui viennent d'être enregistrées du localStorage
        const savedRows = localStorage.getItem(storageKey);
        if (savedRows) {
          try {
            const parsed = JSON.parse(savedRows);
            // Garder seulement les lignes qui n'ont pas été enregistrées (celles qui ne sont pas dans rowsToSave)
            const rowsToSaveIds = new Set(rowsToSave.map(r => r.id));
            const remainingUnsavedRows = parsed.filter((r: EmployeeExpenseRow) => 
              !r.isSaved && !rowsToSaveIds.has(r.id)
            );
            
            if (remainingUnsavedRows.length > 0) {
              localStorage.setItem(storageKey, JSON.stringify(remainingUnsavedRows));
            } else {
              localStorage.removeItem(storageKey);
            }
          } catch (error) {
            console.error("Erreur lors du nettoyage du localStorage:", error);
          }
        }
      }

      // Recharger les données depuis l'API et localStorage
      if (employeeId && currentEmployee) {
        try {
          const response = await fetch(getApiUrl(`employee-expenses/?employee=${employeeId}`));
          if (response.ok) {
            const apiData = await response.json();
            const apiRows: EmployeeExpenseRow[] = apiData.map((item: any) => ({
              id: item.id + 100000,
              date: item.date,
              employee: currentEmployee.full_name,
              somme_remise: item.somme_remise ? parseFloat(item.somme_remise) : null,
              nom_depense: item.nom_depense ?? null,
              somme_depense: item.somme_depense ? parseFloat(item.somme_depense) : null,
              somme_restante: item.somme_restante ? parseFloat(item.somme_restante) : null,
              isSaved: true,
              savedId: item.id,
              employeeId: currentEmployee.id,
            }));
            
            // Charger depuis localStorage (seulement les lignes non enregistrées)
            const storageKey = getStorageKey(employeeId);
            const savedRows = localStorage.getItem(storageKey);
            let localRows: EmployeeExpenseRow[] = [];
            
            if (savedRows) {
              try {
                const parsed = JSON.parse(savedRows);
                // Ne garder que les lignes non enregistrées
                localRows = parsed.filter((r: EmployeeExpenseRow) => !r.isSaved);
              } catch (error) {
                console.error("Erreur lors du chargement des données locales:", error);
              }
            }
            
            // Combiner les deux sources (API + localStorage non enregistrées)
            const allRows = [...apiRows, ...localRows];
            
            // Trier les lignes par ordre d'insertion (savedId pour les enregistrées, id pour les non enregistrées)
            const orderedRows = sortRowsByInsertionOrder(allRows);
            
            // Recalculer les sommes restantes de manière cumulative (cela préservera l'ordre)
            const recalculatedRows = recalculateSommeRestante(orderedRows);
            setRows(recalculatedRows);
            
            // Mettre à jour le localStorage avec seulement les lignes non enregistrées
            const unsavedRows = recalculatedRows.filter((r: EmployeeExpenseRow) => !r.isSaved);
            if (unsavedRows.length > 0) {
              localStorage.setItem(storageKey, JSON.stringify(unsavedRows));
            } else {
              localStorage.removeItem(storageKey);
            }
            
            const maxId = allRows.length > 0 
              ? Math.max(...allRows.map((r: EmployeeExpenseRow) => r.id))
              : 0;
            setNextId(maxId + 1);
          }
        } catch (error) {
          console.error("Erreur lors du rechargement:", error);
        }
      }
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

  // Organiser les lignes par mois (en préservant l'ordre d'insertion)
  const organizeRowsByMonth = () => {
    if (rows.length === 0) return [];
    
    // Ne pas trier par date, garder l'ordre d'insertion
    // Les lignes sont déjà dans le bon ordre grâce à sortRowsByInsertionOrder
    const sortedRows = [...rows];
    
    const organized: Array<{ row: EmployeeExpenseRow, month?: string, showMonth?: boolean }> = [];
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
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 mb-4">
          <PageHeader
            title={currentEmployee ? `Tableau de ${currentEmployee.full_name}` : "Tableau employe"}
            icon={Users}
            action={
              <div className="flex gap-2">
                {currentEmployee && (
                  <Button 
                    onClick={handleSave} 
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
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
                )}
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
          {isLoadingEmployees ? (
            <div className="bg-card rounded-xl border border-border p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Chargement de l'employé...</span>
            </div>
          ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex-1 flex flex-col min-h-0 h-full">
            <div className="overflow-auto flex-1 min-h-0 h-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted sticky top-0 z-20">
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-center font-semibold text-xl text-card-foreground w-[50px] bg-muted">N°</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground w-[140px] bg-muted">Date</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[150px] bg-muted">Somme remise</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[200px] bg-muted">Nom de la dépense</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[150px] bg-muted">Somme dépense</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-bold text-xl text-card-foreground min-w-[150px] bg-muted">Somme restante</th>
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
                            value={row.isSaved ? formatDateDisplay(row.date) : (row.date || "")}
                            onChange={(e) => updateCell(row.id, "date", e.target.value)}
                            onBlur={(e) => {
                              if (!e.target.value.trim()) {
                                updateCell(row.id, "date", getTodayDate());
                              }
                            }}
                            placeholder={getTodayDate()}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-lg md:text-lg font-medium text-foreground disabled:opacity-100 disabled:cursor-default"
                            disabled={row.isSaved}
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center justify-end gap-1 px-1">
                            <Input
                              type="text"
                              value={row.somme_remise !== null && row.somme_remise !== undefined ? formatNumber(row.somme_remise) : ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                const num = cleaned === "" ? null : Number(cleaned);
                                updateCell(row.id, "somme_remise", isNaN(num as number) ? null : num);
                              }}
                              className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground flex-1 disabled:opacity-100 disabled:cursor-default"
                              placeholder="0"
                              disabled={row.isSaved}
                            />
                            {row.somme_remise !== null && row.somme_remise !== undefined && row.somme_remise > 0 && (
                              <span className="text-base font-medium text-foreground">F</span>
                            )}
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <Input
                            type="text"
                            value={row.nom_depense || ""}
                            onChange={(e) => updateCell(row.id, "nom_depense", e.target.value)}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default"
                            disabled={row.isSaved}
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center gap-1 px-1">
                            <Input
                              type="text"
                              value={row.somme_depense !== null && row.somme_depense !== undefined ? formatNumber(row.somme_depense) : ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                const num = cleaned === "" ? null : Number(cleaned);
                                updateCell(row.id, "somme_depense", isNaN(num as number) ? null : num);
                              }}
                              className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground flex-1 disabled:opacity-100 disabled:cursor-default"
                              placeholder="0"
                              disabled={row.isSaved}
                            />
                            {row.somme_depense !== null && row.somme_depense !== undefined && row.somme_depense > 0 && (
                              <span className="text-base font-medium text-foreground">F</span>
                            )}
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-right font-bold text-xl text-foreground bg-muted/20">
                          {row.somme_restante !== null && row.somme_restante !== undefined ? (
                            <span className={`block w-full text-right text-lg font-bold ${row.somme_restante > 0 ? "text-green-600 dark:text-green-400" : row.somme_restante < 0 ? "text-destructive" : "text-card-foreground"}`}>
                              {row.somme_restante > 0 ? "+" : ""}{formatNumber(row.somme_restante)} <span className="text-base">F</span>
                            </span>
                          ) : (
                            <span className="block w-full text-right text-lg font-bold">-</span>
                          )}
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(row.id)}
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Supprimer cette ligne"
                            >
                              <Trash2 size={14} />
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

          {!employeeId && !isLoadingEmployees && (
            <div className="bg-muted/50 rounded-xl border border-border p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-card-foreground mb-2">
                Aucun employé sélectionné
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Retournez à la liste des employés pour sélectionner un employé
              </p>
              <Button onClick={() => navigate("/liste-employes")} className="gap-2">
                <ArrowLeft size={16} />
                Voir la liste des employés
              </Button>
            </div>
          )}
          {employeeId && !isLoadingEmployees && rows.length === 0 && (
            <div className="bg-muted/50 rounded-xl border border-border p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-card-foreground mb-2">
                Aucune dépense pour cet employé
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Cliquez sur "Nouvelle ligne" pour commencer à enregistrer des dépenses
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
      {currentEmployee && (
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

