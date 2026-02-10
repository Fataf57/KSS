import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users, Plus, Trash2, Save, Loader2, Check, ArrowLeft } from "lucide-react";
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
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config/api";

interface ClientChargementRow {
  id: number;
  date_chargement: string;
  nom_produit: string; // Nom du produit
  n_camion: string; // Numéro de camion
  type_operation: "produit" | "avance" | "reglement" | "fin_de_compte"; // Type d'opération
  client: string;
  nombre_sacs: number | null;
  poids: number | null;
  poids_sac_vide: number | null;
  tonnage: number | null;
  prix: number | null;
  somme_totale: number | null;
  avance: number | null;
  somme_restante: number | null;
  isSaved?: boolean;
  savedId?: number;
  clientId?: number; // ID du client dans la base de données
}
const getStorageKey = (clientId?: string) => 
  clientId ? `client_chargements_rows_${clientId}` : "client_chargements_rows";

const NOMS_PRODUITS_PREDEFINIS = ["Anacarde", "Karité", "Sesame", "Soza", "Mais"];

// Fonction pour trier les lignes par ordre d'insertion (savedId pour les enregistrées, id pour les non enregistrées)
// IMPORTANT: Cette fonction est utilisée uniquement lors du chargement initial depuis l'API
// Elle ne doit PAS être utilisée après l'ajout de nouvelles lignes pour préserver leur position
const sortRowsByInsertionOrder = (rows: ClientChargementRow[]): ClientChargementRow[] => {
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
  return `${MOIS_FRANCAIS[month]}${year}`;
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
  
  // Si la date est déjà au format aaaa-mm-jj, la retourner telle quelle
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Si la date est au format jj/mm/aaaa, la convertir
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }
  
  // Essayer de parser la date et la convertir
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

export default function SuiviClients() {
  const { clientId } = useParams<{ clientId: string }>();
  const [rows, setRows] = useState<ClientChargementRow[]>([]);
  // État temporaire pour la saisie texte du poids (permet d'écrire 79,05 sans perdre la virgule)
  const [poidsInputs, setPoidsInputs] = useState<Record<number, string>>({});
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
          
          // Si un clientId est fourni, charger ce client
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
              navigate("/liste-clients");
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des clients:", error);
      }
    };
    fetchClients();
  }, [clientId, navigate, toast]);


  // Charger les chargements depuis l'API et localStorage
  useEffect(() => {
    if (!clientId || !currentClient) return;
    
    const loadChargements = async () => {
      try {
        // Charger depuis l'API
        const response = await fetch(getApiUrl(`client-chargements/?client=${clientId}`));
        if (response.ok) {
          const apiData = await response.json();
          const apiRows: ClientChargementRow[] = apiData.map((item: any) => {
            // Si c'est un règlement avec "FIN DE COMPTE" dans les notes, le marquer comme fin_de_compte
            const isFinDeCompte = item.type_operation === "reglement" && 
              (item.notes?.includes("FIN DE COMPTE") || item.nom_produit?.includes("FIN DE COMPTE"));
            
            return {
              id: item.id + 100000, // ID élevé pour éviter les conflits
              date_chargement: formatDateDisplay(item.date_chargement),
              nom_produit: item.nom_produit || "",
              n_camion: item.n_camion || "",
              type_operation: isFinDeCompte ? "fin_de_compte" : ((item.type_operation || "produit") as "produit" | "avance" | "reglement" | "fin_de_compte"),
              client: currentClient.full_name,
              nombre_sacs: item.nombre_sacs ?? null,
              poids: item.poids ? parseFloat(item.poids) : null,
              poids_sac_vide: item.poids_sac_vide ? parseFloat(item.poids_sac_vide) : null,
              tonnage: item.tonnage ? parseFloat(item.tonnage) : null,
              prix: item.prix ? parseFloat(item.prix) : null,
              somme_totale: item.somme_totale ? parseFloat(item.somme_totale) : null,
              avance: item.avance ? parseFloat(item.avance) : null,
              somme_restante: null, // Toujours recalculer côté frontend pour garantir l'ordre correct
              isSaved: true,
              savedId: item.id,
              clientId: currentClient.id,
            };
          });
          
          // Charger depuis localStorage seulement les lignes non enregistrées
          const storageKey = getStorageKey(clientId);
          const savedRows = localStorage.getItem(storageKey);
          let localRows: ClientChargementRow[] = [];
          
          if (savedRows) {
            try {
              const parsed = JSON.parse(savedRows);
              // Filtrer pour ne garder que les lignes non enregistrées
              localRows = Array.isArray(parsed) 
                ? parsed.filter((r: ClientChargementRow) => !r.isSaved)
                : [];
            } catch (error) {
              console.error("Erreur lors du chargement des données locales:", error);
            }
          }
          
          // Combiner les lignes de l'API et du localStorage (seulement les non enregistrées)
          // Les lignes de l'API peuvent être dans un ordre différent (triées par date décroissante)
          // Il faut les trier par savedId (ID de la base) pour préserver l'ordre d'insertion
          const allRows = [...apiRows, ...localRows];
          
          // Trier les lignes par ordre d'insertion (savedId pour les enregistrées, id pour les non enregistrées)
          const orderedRows = sortRowsByInsertionOrder(allRows);
          
          // Recalculer les sommes restantes de manière cumulative (cela préservera l'ordre)
          setRows(recalculateSommeRestante(orderedRows));
          
          const maxId = allRows.length > 0 
            ? Math.max(...allRows.map((r: ClientChargementRow) => r.id))
            : 0;
          setNextId(maxId + 1);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des chargements:", error);
      }
    };
    
    loadChargements();
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
  const recalculateSommeRestante = (rowsToCalculate: ClientChargementRow[]): ClientChargementRow[] => {
    // Préserver l'ordre d'insertion : ne pas trier, garder l'ordre tel quel
    // Les lignes enregistrées doivent rester dans leur ordre d'insertion
    // Les lignes non enregistrées doivent rester à leur position d'ajout (généralement en bas)
    
    // Ne pas trier, garder l'ordre exact tel qu'il est passé
    // Cela préserve la position des nouvelles lignes ajoutées
    const sortedRows = [...rowsToCalculate];

    // Calculer la somme restante de manière cumulative (formule Excel: I2+G3-H3)
    let somme_restante_precedente = 0;
    return sortedRows.map(row => {
      // Si c'est une ligne "fin de compte", réinitialiser le solde à 0
      if (row.type_operation === "fin_de_compte") {
        const somme_totale = row.somme_totale !== null ? Number(row.somme_totale) : 0;
        const avance = row.avance !== null ? Number(row.avance) : 0;
        
        // Calculer la somme restante (devrait être 0 après une fin de compte)
        // Formule : somme_restante_précédente + somme_totale - avance
        const somme_restante = somme_restante_precedente + somme_totale - avance;
        
        // Réinitialiser la somme_restante_precedente à 0 pour les lignes suivantes
        somme_restante_precedente = 0;
        
        return { 
          ...row, 
          somme_restante: 0 // Toujours 0 pour une fin de compte
        };
      }
      
      const somme_totale = row.somme_totale !== null ? Number(row.somme_totale) : 0;
      const avance = row.avance !== null ? Number(row.avance) : 0;
      
      // Formule : somme_restante_précédente + somme_totale - avance
      const somme_restante = somme_restante_precedente + somme_totale - avance;
      somme_restante_precedente = somme_restante;
      
      return { ...row, somme_restante };
    });
  };

  const updateCell = (id: number, field: keyof ClientChargementRow, value: string | number | null) => {
    setRows(prevRows => {
      // Mettre à jour la ligne modifiée
      const updatedRows = prevRows.map(row => {
        if (row.id === id) {
          // Pour les dates et les chaînes, garder la valeur telle quelle
          if (field === "date_chargement" || field === "client" || field === "type_operation" || field === "nom_produit" || field === "n_camion") {
            const updated = { ...row, [field]: value as string };
            
            // Recalculer les sommes restantes si la date change (car le tri peut changer)
            if (field === "date_chargement") {
              return updated;
            }
            return updated;
          }
          
          // Pour les autres champs numériques, convertir les valeurs vides en null
          const numValue = value === "" || value === null || value === undefined ? null : (typeof value === "string" ? (value === "" ? null : Number(value)) : value);
          const updated = { ...row, [field]: numValue };
          
          // Calcul automatique du tonnage (nombre de sacs × poids) si les deux sont fournis
          // Soustraire le poids des sacs vides si fourni
          if (field === "nombre_sacs" || field === "poids" || field === "poids_sac_vide") {
            if (updated.nombre_sacs !== null && updated.poids !== null) {
              const tonnage_brut = Number(updated.nombre_sacs) * Number(updated.poids);
              
              // Soustraire le poids des sacs vides si fourni
              if (updated.poids_sac_vide !== null && updated.poids_sac_vide > 0) {
                const poids_total_sacs_vides = Number(updated.nombre_sacs) * Number(updated.poids_sac_vide);
                updated.tonnage = tonnage_brut - poids_total_sacs_vides;
              } else {
                updated.tonnage = tonnage_brut;
              }
            } else {
              updated.tonnage = null;
            }
          }
          
          // Recalculer la somme totale si tonnage ou prix change
          if (field === "nombre_sacs" || field === "poids" || field === "poids_sac_vide" || field === "prix" || field === "tonnage") {
            if (updated.tonnage !== null && updated.prix !== null) {
              updated.somme_totale = Number(updated.tonnage) * Number(updated.prix);
            } else {
              updated.somme_totale = null;
            }
          }
          
          return updated;
        }
        return row;
      });
      
      // Recalculer toutes les sommes restantes de manière cumulative
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

    const newRow: ClientChargementRow = {
      id: nextId,
      date_chargement: getTodayDate(),
      nom_produit: "",
      n_camion: "",
      type_operation: "produit", // Par défaut "produit"
      client: currentClient.full_name,
      nombre_sacs: null,
      poids: null,
      poids_sac_vide: null,
      tonnage: null,
      prix: null,
      somme_totale: null,
      avance: null,
      somme_restante: null,
      isSaved: false,
      clientId: currentClient.id,
    };
    // Ajouter la nouvelle ligne à la fin, sans trier
    // Elle restera à sa position d'ajout
    const updatedRows = [...rows, newRow];
    // Recalculer toutes les sommes restantes après ajout (préserve l'ordre)
    setRows(recalculateSommeRestante(updatedRows));
    setNextId(nextId + 1);
  };

  const addFinDeCompteRow = () => {
    if (!currentClient) {
      toast({
        title: "Erreur",
        description: "Aucun client sélectionné",
        variant: "destructive",
      });
      return;
    }

    // Calculer la somme restante actuelle (dernière ligne)
    const lastRow = rows[rows.length - 1];
    const sommeRestanteActuelle = lastRow?.somme_restante ?? 0;

    // Pour solder le compte :
    // - Si somme_restante > 0 (le client nous doit), on met une avance égale à cette somme
    // - Si somme_restante < 0 (on doit au client), on met une somme_totale égale à la valeur absolue
    // - Si somme_restante = 0, on ne fait rien (déjà soldé)
    
    let somme_totale: number | null = null;
    let avance: number | null = null;
    
    if (sommeRestanteActuelle > 0) {
      // Le client nous doit de l'argent : on met une avance pour solder
      avance = sommeRestanteActuelle;
      somme_totale = 0;
    } else if (sommeRestanteActuelle < 0) {
      // On doit au client : on met une somme_totale pour solder
      somme_totale = Math.abs(sommeRestanteActuelle);
      avance = 0;
    } else {
      // Déjà soldé
      somme_totale = 0;
      avance = 0;
    }

    // Créer une ligne "fin de compte" qui solde le compte
    const newRow: ClientChargementRow = {
      id: nextId,
      date_chargement: getTodayDate(),
      nom_produit: "FIN DE COMPTE",
      n_camion: "",
      type_operation: "fin_de_compte",
      client: currentClient.full_name,
      nombre_sacs: null,
      poids: null,
      poids_sac_vide: null,
      tonnage: null,
      prix: null,
      somme_totale: somme_totale,
      avance: avance,
      somme_restante: 0, // Sera recalculé mais sera 0
      isSaved: false,
      clientId: currentClient.id,
    };
    
    // Ajouter la nouvelle ligne à la fin, sans trier
    // Elle restera à sa position d'ajout
    const updatedRows = [...rows, newRow];
    // Recalculer toutes les sommes restantes après ajout (préserve l'ordre)
    setRows(recalculateSommeRestante(updatedRows));
    setNextId(nextId + 1);
    
    toast({
      title: "Fin de compte ajoutée",
      description: "Le compte a été soldé. Vous pouvez maintenant commencer un nouveau compte.",
    });
  };


  // Vérifier si une ligne fait partie d'une période déjà arrêtée
  const isRowInStoppedAccount = (row: ClientChargementRow): boolean => {
    // Si c'est une ligne "fin_de_compte" enregistrée, elle ne peut pas être supprimée
    if (row.type_operation === "fin_de_compte" && row.isSaved) {
      return true;
    }

    // Trouver l'index de la ligne dans le tableau
    const rowIndex = rows.findIndex(r => r.id === row.id);
    if (rowIndex === -1) return false;

    // Vérifier s'il existe une ligne "fin_de_compte" après cette ligne dans l'ordre d'insertion
    // Cela signifie que cette ligne fait partie d'une période qui a été arrêtée
    for (let i = rowIndex + 1; i < rows.length; i++) {
      if (rows[i].type_operation === "fin_de_compte") {
        return true;
      }
    }

    return false;
  };

  const handleDeleteClick = (id: number) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    // Empêcher la suppression des lignes dans une période déjà arrêtée
    if (isRowInStoppedAccount(row)) {
      toast({
        title: "Suppression impossible",
        description: "Impossible de supprimer une ligne d'un compte déjà arrêté",
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
        const response = await fetch(getApiUrl(`client-chargements/${row.savedId}/`), {
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
              if (errorData.non_field_errors) {
                errorMessage = Array.isArray(errorData.non_field_errors) 
                  ? errorData.non_field_errors.join(", ")
                  : errorData.non_field_errors;
              }
            }
          } catch (e) {
            // Si on ne peut pas parser l'erreur, utiliser le message par défaut
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        toast({
          title: "Succès",
          description: "Chargement supprimé avec succès",
        });
        
        window.dispatchEvent(new Event('stock-updated'));
        
        // Recharger les données depuis l'API
        if (clientId && currentClient) {
          const loadChargements = async () => {
            try {
              const response = await fetch(getApiUrl(`client-chargements/?client=${clientId}`));
              if (response.ok) {
                const apiData = await response.json();
                const apiRows: ClientChargementRow[] = apiData.map((item: any) => {
                  // Si c'est un règlement avec "FIN DE COMPTE" dans les notes, le marquer comme fin_de_compte
                  const isFinDeCompte = item.type_operation === "reglement" && 
                    (item.notes?.includes("FIN DE COMPTE") || item.nom_produit?.includes("FIN DE COMPTE"));
                  
                  return {
                    id: item.id + 100000,
                    date_chargement: formatDateDisplay(item.date_chargement),
                    nom_produit: item.nom_produit || "",
                    n_camion: item.n_camion || "",
                    type_operation: isFinDeCompte ? "fin_de_compte" : ((item.type_operation || "produit") as "produit" | "avance" | "reglement" | "fin_de_compte"),
                    client: currentClient.full_name,
                    nombre_sacs: item.nombre_sacs ?? null,
                    poids: item.poids ? parseFloat(item.poids) : null,
                    poids_sac_vide: item.poids_sac_vide ? parseFloat(item.poids_sac_vide) : null,
                    tonnage: item.tonnage ? parseFloat(item.tonnage) : null,
                    prix: item.prix ? parseFloat(item.prix) : null,
                    somme_totale: item.somme_totale ? parseFloat(item.somme_totale) : null,
                    avance: item.avance ? parseFloat(item.avance) : null,
                    somme_restante: item.somme_restante ? parseFloat(item.somme_restante) : null,
                    isSaved: true,
                    savedId: item.id,
                    clientId: currentClient.id,
                  };
                });

                const savedRows = localStorage.getItem(getStorageKey(clientId));
                let unsavedRows: ClientChargementRow[] = [];
                if (savedRows) {
                  try {
                    unsavedRows = JSON.parse(savedRows).filter((r: ClientChargementRow) => !r.isSaved);
                  } catch (e) {
                    console.error("Erreur lors du chargement des données:", e);
                  }
                }

                const allRows = [...apiRows, ...unsavedRows];
                
                // Trier par ordre d'insertion
                const orderedRows = sortRowsByInsertionOrder(allRows);
                
                setRows(recalculateSommeRestante(orderedRows));
              }
            } catch (error) {
              console.error("Erreur lors du rechargement:", error);
            }
          };
          loadChargements();
        } else {
          // Si pas d'API, juste supprimer localement
          const updatedRows = rows.filter(row => row.id !== id);
          const finalRows = recalculateSommeRestante(updatedRows);
          setRows(finalRows);
          
          // Mettre à jour le localStorage pour supprimer la ligne
          if (clientId) {
            const storageKey = getStorageKey(clientId);
            const unsavedRows = finalRows.filter(r => !r.isSaved);
            if (unsavedRows.length > 0) {
              localStorage.setItem(storageKey, JSON.stringify(unsavedRows));
            } else {
              localStorage.removeItem(storageKey);
            }
          }
        }
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message || "Impossible de supprimer le chargement",
          variant: "destructive",
        });
        console.error("Erreur suppression:", error);
      } finally {
        setDeleteDialogOpen(false);
        setRowToDelete(null);
      }
    } else {
      const updatedRows = rows.filter(row => row.id !== id);
      // Recalculer toutes les sommes restantes après suppression
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

  const validateRow = (row: ClientChargementRow): string | null => {
    // Permettre l'enregistrement si la ligne est complètement vide
    const isRowEmpty = !row.date_chargement && !row.client && !row.nom_produit?.trim() && 
                       !row.nombre_sacs && !row.poids && !row.tonnage && 
                       !row.prix && !row.somme_totale && !row.avance;
    if (isRowEmpty) return null;
    
    // Si au moins un champ est rempli, valider les champs requis
    if (!row.date_chargement) return "La date est requise";
    if (!row.client) return "Le client est requis";
    // Les autres champs sont optionnels - on peut enregistrer seulement une avance
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

    // Permettre la modification si la ligne est en cours de Enregistrement
    if (row.isSaved && savingRowId !== row.id) {
      toast({
        title: "Déjà enregistré",
        description: "Ce chargement a déjà été enregistré",
      });
      return;
    }

    // Utiliser le clientId stocké ou le client actuel
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
      // Pour les lignes "fin_de_compte", utiliser "reglement" côté backend
      const typeOperationBackend = row.type_operation === "fin_de_compte" ? "reglement" : (row.type_operation || "produit");
      
      const payload = {
        date_chargement: convertDateToAPIFormat(row.date_chargement),
        nom_produit: row.nom_produit || "",
        n_camion: row.n_camion || "",
        type_operation: typeOperationBackend,
        client: clientIdToUse,
        nombre_sacs: row.nombre_sacs ?? null,
        poids: row.poids ?? null,
        poids_sac_vide: row.poids_sac_vide ?? null,
        prix: row.prix ?? null,
        somme_totale: row.somme_totale ?? null, // Inclure somme_totale pour les lignes de règlement et fin de compte
        avance: row.avance ?? 0,
        notes: row.type_operation === "fin_de_compte" ? "FIN DE COMPTE" : "",
      };

      const response = await fetch(getApiUrl("client-chargements/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de la Enregistrement");
      }

      const savedData = await response.json();
      
      setRows(prevRows => {
        const updatedRows = prevRows.map(r => {
          if (r.id === rowId) {
            // Mettre à jour avec savedId mais garder l'id original pour éviter les problèmes avec React
            return { 
              ...r, 
              isSaved: true, 
              savedId: savedData.id, 
              clientId: clientIdToUse 
            };
          }
          return r;
        });
        return recalculateSommeRestante(updatedRows);
      });

      toast({
        title: "Succès !",
        description: "Chargement enregistré avec succès",
      });
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
        // Pour les lignes "fin_de_compte", utiliser "reglement" côté backend
        const typeOperationBackend = row.type_operation === "fin_de_compte" ? "reglement" : (row.type_operation || "produit");
        
        const payload = {
          date_chargement: convertDateToAPIFormat(row.date_chargement),
          nom_produit: row.nom_produit || "",
          n_camion: row.n_camion || "",
          type_operation: typeOperationBackend,
          client: currentClient.id,
          nombre_sacs: row.nombre_sacs ?? null,
          poids: row.poids ?? null,
          poids_sac_vide: row.poids_sac_vide ?? null,
          prix: row.prix ?? null,
          somme_totale: row.somme_totale ?? null, // Inclure somme_totale pour les lignes de règlement et fin de compte
          avance: row.avance ?? 0,
          notes: row.type_operation === "fin_de_compte" ? "FIN DE COMPTE" : "",
        };

        const response = await fetch(getApiUrl("client-chargements/"), {
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

      // Mettre à jour les lignes avec leurs IDs sauvegardés
      setRows(prevRows => {
        // Créer un map pour associer chaque ligne non enregistrée à sa réponse
        const savedDataMap = new Map();
        unsavedRows.forEach((row, index) => {
          savedDataMap.set(row.id, savedData[index]);
        });

        // Préserver l'ordre exact de prevRows : mettre à jour les lignes en place sans les déplacer
        const updatedRows = prevRows.map(row => {
          // Si la ligne n'était pas enregistrée et qu'elle vient d'être enregistrée
          if (!row.isSaved) {
            const savedItem = savedDataMap.get(row.id);
            if (savedItem) {
              // Mettre à jour avec savedId mais garder l'id original et la position exacte
              return { 
                ...row, 
                isSaved: true, 
                savedId: savedItem.id, 
                clientId: currentClient.id 
              };
            }
          }
          // Garder la ligne telle quelle (déjà enregistrée ou non enregistrée)
          return row;
        });
        
        // NE PAS TRIER ici pour préserver l'ordre d'ajout des nouvelles lignes
        // Les lignes enregistrées gardent leur position, les nouvelles lignes restent à la fin
        const orderedRows = updatedRows;
        
        // Recalculer les sommes restantes en préservant l'ordre
        const finalRows = recalculateSommeRestante(orderedRows);
        
        // Nettoyer le localStorage pour ce client (les lignes enregistrées ne doivent plus être dans localStorage)
        // Le useEffect existant gérera cela automatiquement, mais on le fait ici aussi pour être sûr
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
        description: `${unsavedRows.length} chargement(s) enregistré(s) avec succès`,
      });

      window.dispatchEvent(new Event('stock-updated'));
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

  // Organiser les lignes en respectant l'ordre d'enregistrement
  const organizeRowsByMonth = () => {
    if (rows.length === 0) return [];
    
    // Préserver l'ordre d'insertion : ne pas trier, garder l'ordre tel quel
    // Les lignes enregistrées doivent rester dans leur ordre d'insertion
    // Les lignes non enregistrées doivent rester en bas
    
    // Ne pas séparer, garder l'ordre tel quel
    // Les lignes enregistrées sont déjà dans leur ordre d'insertion
    // Les lignes non enregistrées sont déjà en bas
    const sortedRows = [...rows];
    
    const organized: Array<{ row: ClientChargementRow, month?: string, showMonth?: boolean }> = [];
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
      <datalist id="noms-produits">
        {NOMS_PRODUITS_PREDEFINIS.map((produit) => (
          <option key={produit} value={produit} />
        ))}
      </datalist>
      <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="flex-shrink-0 mb-4">
          <PageHeader
            title={currentClient ? `Suivi - ${currentClient.full_name}` : "Tableau client"}
            description={currentClient ? "Chargements et dettes de ce client" : "Sélectionnez un client"}
            icon={Users}
            action={
              <div className="flex gap-2">
                {currentClient && (
                  <>
                    <Button 
                      onClick={addFinDeCompteRow} 
                      variant="outline" 
                      className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                      title="Ajouter une ligne 'Fin de compte' pour solder le compte et commencer un nouveau compte"
                    >
                      <Check size={16} />
                      Fin de compte
                    </Button>
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
          {currentClient ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex-1 flex flex-col min-h-0 h-full">
              <div className="overflow-auto flex-1 min-h-0 h-full">
                <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted sticky top-0 z-20">
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-center font-semibold text-xl text-card-foreground w-[50px] bg-muted">N°</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground w-[150px] bg-muted">Date</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[170px] bg-muted">Nom Produit</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[180px] bg-muted">N camion</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[55px] bg-muted">Nb. sacs</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[50px] bg-muted">Poids</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[140px] bg-muted">Tonnage</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[65px] bg-muted">Prix/kg</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[130px] bg-muted">Somme totale</th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[150px] bg-muted">Avance</th>
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
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0 w-[150px]">
                          <Input
                            type="text"
                            value={row.date_chargement || ""}
                            onChange={(e) => updateCell(row.id, "date_chargement", e.target.value)}
                            onBlur={(e) => {
                              if (!e.target.value.trim()) {
                                updateCell(row.id, "date_chargement", getTodayDate());
                              }
                            }}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-lg md:text-lg font-medium text-foreground w-full"
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <Input
                            type="text"
                            list="noms-produits"
                            value={row.nom_produit || ""}
                            onChange={(e) => updateCell(row.id, "nom_produit", e.target.value)}
                            className={`border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default ${
                              row.type_operation === "fin_de_compte" ? "text-red-600 dark:text-red-400" : ""
                            }`}
                            disabled={row.isSaved && savingRowId !== row.id}
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <Input
                            type="text"
                            value={row.n_camion || ""}
                            onChange={(e) => updateCell(row.id, "n_camion", e.target.value)}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default"
                            disabled={row.isSaved && savingRowId !== row.id}
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <Input
                            type="text"
                            value={row.nombre_sacs !== null && row.nombre_sacs !== undefined ? formatNumber(row.nombre_sacs) : ""}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                              const num = cleaned === "" ? null : Number(cleaned);
                              updateCell(row.id, "nombre_sacs", isNaN(num as number) ? null : num);
                            }}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default"
                            disabled={row.isSaved && savingRowId !== row.id}
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center justify-end">
                            <Input
                              type="text"
                              value={
                                poidsInputs[row.id] !== undefined
                                  ? poidsInputs[row.id]
                                  : row.poids !== null && row.poids !== undefined
                                    ? formatNumber(row.poids)
                                    : ""
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                // Mémoriser exactement ce que tape l'utilisateur (avec virgule)
                                setPoidsInputs((prev) => ({
                                  ...prev,
                                  [row.id]: raw,
                                }));

                                const cleaned = raw.replace(/\s/g, "").replace(",", ".");

                                if (cleaned === "") {
                                  updateCell(row.id, "poids", null);
                                  return;
                                }

                                const num = Number(cleaned);
                                if (!isNaN(num)) {
                                  updateCell(row.id, "poids", num);
                                }
                              }}
                              onBlur={() => {
                                // À la sortie du champ, revenir à l'affichage formaté standard
                                setPoidsInputs((prev) => {
                                  const { [row.id]: _omit, ...rest } = prev;
                                  return rest;
                                });
                              }}
                              className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default flex-1"
                              disabled={row.isSaved && savingRowId !== row.id}
                            />
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-right font-medium text-xl text-foreground bg-muted/20">
                          {row.tonnage !== null && row.tonnage !== undefined ? (
                            <span className="block w-full text-right text-lg">
                              {formatNumber(row.tonnage)} <span className="text-base">kg</span>
                            </span>
                          ) : (
                            <span className="block w-full text-right text-lg">-</span>
                          )}
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center justify-end">
                            <Input
                              type="text"
                              value={row.prix !== null && row.prix !== undefined ? formatNumber(row.prix) : ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                const num = cleaned === "" ? null : Number(cleaned);
                                updateCell(row.id, "prix", isNaN(num as number) ? null : num);
                              }}
                              className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground disabled:opacity-100 disabled:cursor-default flex-1"
                              disabled={row.isSaved && savingRowId !== row.id}
                            />
                            {row.prix !== null && row.prix !== undefined && row.prix > 0 && (
                              <span className="text-base text-muted-foreground px-1">F</span>
                            )}
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-right font-medium text-xl text-foreground bg-muted/20">
                          {row.somme_totale !== null && row.somme_totale !== undefined ? (
                            <span className="block w-full text-right text-lg">
                              {formatNumber(row.somme_totale)} <span className="text-base">F</span>
                            </span>
                          ) : (
                            <span className="block w-full text-right text-lg">-</span>
                          )}
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
                              disabled={row.isSaved && savingRowId !== row.id}
                            />
                            {row.avance !== null && row.avance !== undefined && row.avance > 0 && (
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
                            disabled={isRowInStoppedAccount(row)}
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isRowInStoppedAccount(row) ? "Impossible de supprimer une ligne d'un compte déjà arrêté" : "Supprimer cette ligne"}
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
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-card-foreground mb-2">
                  Aucun chargement pour ce client
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Cliquez sur "Nouvelle ligne" pour commencer à enregistrer des chargements
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
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-card-foreground mb-2">
                Aucun client sélectionné
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Retournez à la liste des clients pour sélectionner un client
              </p>
              <Button onClick={() => navigate("/liste-clients")} className="gap-2">
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

