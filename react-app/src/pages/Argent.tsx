import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Receipt, Plus, Loader2, ArrowLeft, Trash2, Save } from "lucide-react";
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
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config/api";

interface ArgentRow {
  id: number;
  date: string;
  nom_recuperant: string;
  nom_boss: string;
  lieu_retrait: string;
  somme: number | null;
  nom_recevant: string;
  date_sortie: string;
  somme_sortie: number | null;
}

const getTodayDate = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

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

export default function Argent() {
  const [rows, setRows] = useState<ArgentRow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [agentDate, setAgentDate] = useState<string>(getTodayDate());
  const [agentNomRecuperant, setAgentNomRecuperant] = useState<string>("");
  const [agentNomBoss, setAgentNomBoss] = useState<string>("");
  const [agentLieuRetrait, setAgentLieuRetrait] = useState<string>("");
  const [agentSomme, setAgentSomme] = useState<number | null>(null);
  const [agentNomRecevant, setAgentNomRecevant] = useState<string>("");
  const [agentDateSortie, setAgentDateSortie] = useState<string>(getTodayDate());
  const [agentSommeSortie, setAgentSommeSortie] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set()); // IDs réels chargés depuis le serveur
  const navigate = useNavigate();
  const { toast } = useToast();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { user, token } = useAuth();
  const isBoss = user?.role === "boss";
  const isAgent = user?.role === "agent";

  useEffect(() => {
    setIsLoading(true);
    const fetchRows = async () => {
      try {
        const response = await fetch(getApiUrl("argent/"), {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error("Erreur lors du chargement des entrées d'argent");
        }

        const data = await response.json();
        // Combiner les entrées et sorties dans un seul tableau
        const rowsList: ArgentRow[] = [];
        const savedIdsSet = new Set<number>();

        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            // Créer une ligne combinée avec toutes les données
            rowsList.push({
              id: item.id,
              date: item.date
                ? `${String(new Date(item.date).getDate()).padStart(2, "0")}/${String(
                    new Date(item.date).getMonth() + 1,
                  ).padStart(2, "0")}/${new Date(item.date).getFullYear()}`
                : getTodayDate(),
              nom_recuperant: item.nom_recuperant || "",
              nom_boss: item.nom_boss || "",
              lieu_retrait: item.lieu_retrait || "",
              somme: item.somme !== null && item.somme !== undefined ? Number(item.somme) : null,
              nom_recevant: item.nom_recevant || "",
              date_sortie: item.date_sortie
                ? `${String(new Date(item.date_sortie).getDate()).padStart(2, "0")}/${String(
                    new Date(item.date_sortie).getMonth() + 1,
                  ).padStart(2, "0")}/${new Date(item.date_sortie).getFullYear()}`
                : "",
              somme_sortie: item.somme_sortie !== null && item.somme_sortie !== undefined ? Number(item.somme_sortie) : null,
            });
            savedIdsSet.add(item.id);
          });
        }

        setRows(rowsList);
        setSavedIds(savedIdsSet);
        const maxId = rowsList.length > 0 ? Math.max(...rowsList.map((r) => r.id)) : 0;
        setNextId(maxId + 1);
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message || "Impossible de charger les entrées d'argent",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRows();
  }, [toast, token]);

  const handleSave = async () => {
    setIsSaving(true);
    const today = getTodayDate();

    try {
      // Cas agent : enregistrement d'une seule nouvelle entrée via l'API
      if (isAgent) {
        // Vérifier si au moins un champ est rempli
        const hasAnyData = 
          (agentSomme !== null && agentSomme !== undefined) ||
          (agentSommeSortie !== null && agentSommeSortie !== undefined);
        
        if (!hasAnyData) {
          toast({
            title: "Champs manquants",
            description: "Veuillez remplir au moins un champ avant d'enregistrer.",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        
        // Déterminer si on a une entrée ou une sortie pour choisir la date appropriée
        const hasEntree = agentSomme !== null;
        const hasSortie = agentSommeSortie !== null;

        // Si on a seulement une sortie, utiliser date_sortie comme date principale
        const dateToUse = hasEntree ? (agentDate || today) : (agentDateSortie || today);
        const [day, month, year] = dateToUse.split("/");
        const isoDate = `${year}-${month}-${day}`;
        const [daySortie, monthSortie, yearSortie] = (agentDateSortie || today).split("/");
        const isoDateSortie = agentDateSortie ? `${yearSortie}-${monthSortie}-${daySortie}` : null;

        const response = await fetch(getApiUrl("argent/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            date: isoDate,
            nom_recuperant: agentNomRecuperant || "",
            nom_boss: agentNomBoss || "",
            lieu_retrait: agentLieuRetrait || "",
            somme: agentSomme !== null && agentSomme !== undefined ? agentSomme : null,
            nom_recevant: agentNomRecevant || "",
            date_sortie: isoDateSortie,
            somme_sortie: agentSommeSortie,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Erreur lors de l'enregistrement de l'entrée d'argent";
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch {
            // ignore
          }
          throw new Error(errorMessage);
        }

        const created = await response.json();

        // Vérifier si la ligne existe déjà avant de l'ajouter
        setRows((prev) => {
          // Vérifier si cette ligne existe déjà (par ID)
          if (prev.some((r) => r.id === created.id)) {
            // Si elle existe, la mettre à jour au lieu de l'ajouter
            return prev.map((r) => (r.id === created.id ? {
              id: created.id,
              date: agentDate || today,
              nom_recuperant: agentNomRecuperant || "",
              nom_boss: agentNomBoss || "",
              lieu_retrait: agentLieuRetrait || "",
              somme: agentSomme,
              nom_recevant: agentNomRecevant || "",
              date_sortie: agentDateSortie || "",
              somme_sortie: agentSommeSortie,
            } : r));
          }
          // Sinon, l'ajouter
          return [...prev, {
            id: created.id,
            date: agentDate || today,
            nom_recuperant: agentNomRecuperant || "",
            nom_boss: agentNomBoss || "",
            lieu_retrait: agentLieuRetrait || "",
            somme: agentSomme,
            nom_recevant: agentNomRecevant || "",
            date_sortie: agentDateSortie || "",
            somme_sortie: agentSommeSortie,
          }];
        });
        setSavedIds((prev) => new Set([...prev, created.id]));

        // On réinitialise la ligne agent pour permettre une nouvelle saisie
        setAgentDate(getTodayDate());
        setAgentNomRecuperant("");
        setAgentNomBoss("");
        setAgentLieuRetrait("");
        setAgentSomme(null);
        setAgentNomRecevant("");
        setAgentDateSortie(getTodayDate());
        setAgentSommeSortie(null);

        toast({
          title: "Enregistré",
          description: "Votre entrée d'argent a été enregistrée. Vous pouvez saisir une nouvelle entrée.",
        });
      } else if (isBoss) {
        // Cas boss : sauvegarder toutes les modifications du tableau unique
        const errors: string[] = [];
        const createdIds = new Map<number, number>(); // Map des IDs temporaires vers les IDs réels créés
        
        // Séparer les nouvelles lignes et les lignes existantes
        // Les nouvelles lignes sont celles dont l'ID n'est pas dans savedIds
        // ET qui ont au moins un champ rempli
        const newRows = rows.filter((row) => {
          if (savedIds.has(row.id)) return false;
          // Vérifier si au moins un champ est rempli
          const hasAnyData = 
            (row.somme !== null && row.somme !== undefined) ||
            (row.somme_sortie !== null && row.somme_sortie !== undefined);
          return hasAnyData;
        });
        const existingRows = rows.filter((row) => savedIds.has(row.id));

        // Sauvegarder les nouvelles lignes (POST)
        for (const row of newRows) {
          // Ignorer les lignes complètement vides
          const hasAnyData = 
            (row.somme !== null && row.somme !== undefined) ||
            (row.somme_sortie !== null && row.somme_sortie !== undefined);
          
          if (!hasAnyData) {
            continue;
          }
          
          // Déterminer si on a une entrée ou une sortie pour choisir la date appropriée
          const hasEntree = row.somme !== null;
          const hasSortie = row.somme_sortie !== null;

          // Vérifier si cette ligne a déjà été créée dans cette session
          if (createdIds.has(row.id)) {
            continue;
          }

          try {
            // Si on a seulement une sortie, utiliser date_sortie comme date principale
            const dateToUse = hasEntree ? (row.date || today) : (row.date_sortie || today);
            const [day, month, year] = dateToUse.split("/");
            const isoDate = `${year}-${month}-${day}`;
            
            const [daySortie, monthSortie, yearSortie] = row.date_sortie 
              ? row.date_sortie.split("/")
              : [null, null, null];
            const isoDateSortie = row.date_sortie 
              ? `${yearSortie}-${monthSortie}-${daySortie}` 
              : null;

            const requestBody = {
              date: isoDate,
              nom_recuperant: row.nom_recuperant || "",
              nom_boss: row.nom_boss || "",
              lieu_retrait: row.lieu_retrait || "",
              somme: row.somme !== null && row.somme !== undefined ? row.somme : null,
              nom_recevant: row.nom_recevant || "",
              date_sortie: isoDateSortie,
              somme_sortie: row.somme_sortie,
            };

            console.log("Envoi de la requête POST argent/ avec:", requestBody);

            const response = await fetch(getApiUrl("argent/"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              let errorMessage = `Erreur lors de l'enregistrement de la ligne`;
              let errorDetails = "";
              try {
                const errorData = await response.json();
                console.error("Réponse d'erreur du serveur:", errorData);
                // Gérer les erreurs de validation DRF
                if (errorData.non_field_errors) {
                  errorMessage = Array.isArray(errorData.non_field_errors)
                    ? errorData.non_field_errors.join(", ")
                    : errorData.non_field_errors;
                } else if (errorData.detail) {
                  errorMessage = errorData.detail;
                } else if (errorData.message) {
                  errorMessage = errorData.message;
                } else {
                  // Afficher toutes les erreurs de validation par champ
                  const fieldErrors = Object.entries(errorData)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value[0] : value}`)
                    .join(", ");
                  if (fieldErrors) {
                    errorMessage = fieldErrors;
                  }
                }
                errorDetails = JSON.stringify(errorData, null, 2);
              } catch (e) {
                errorMessage = `Erreur ${response.status}: ${response.statusText}`;
              }
              errors.push(errorMessage);
              console.error("Erreur lors de l'enregistrement:", errorMessage);
              console.error("Détails de l'erreur:", errorDetails);
              console.error("Données envoyées:", requestBody);
            } else {
              // Mettre à jour l'ID de la ligne avec l'ID retourné par le serveur
              const created = await response.json();
              createdIds.set(row.id, created.id);
            }
          } catch (error: any) {
            errors.push(`Erreur pour la ligne: ${error.message}`);
          }
        }

        // Mettre à jour les lignes existantes (PUT)
        for (const row of existingRows) {
          try {
            // Déterminer si on a une entrée ou une sortie pour choisir la date appropriée
            const hasEntree = row.somme !== null;
            const hasSortie = row.somme_sortie !== null;
            
            // Si on a seulement une sortie, utiliser date_sortie comme date principale
            const dateToUse = hasEntree ? (row.date || today) : (row.date_sortie || row.date || today);
            const [day, month, year] = dateToUse.split("/");
            const isoDate = `${year}-${month}-${day}`;
            
            const [daySortie, monthSortie, yearSortie] = row.date_sortie 
              ? row.date_sortie.split("/")
              : [null, null, null];
            const isoDateSortie = row.date_sortie 
              ? `${yearSortie}-${monthSortie}-${daySortie}` 
              : null;

            const response = await fetch(getApiUrl(`argent/${row.id}/`), {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                date: isoDate,
                nom_recuperant: row.nom_recuperant || "",
                nom_boss: row.nom_boss || "",
                lieu_retrait: row.lieu_retrait || "",
                somme: row.somme !== null && row.somme !== undefined ? row.somme : null,
                nom_recevant: row.nom_recevant || "",
                date_sortie: isoDateSortie,
                somme_sortie: row.somme_sortie,
              }),
            });

            // Si la ligne n'existe pas (404), essayer de la créer avec POST
            if (response.status === 404) {
              const postResponse = await fetch(getApiUrl("argent/"), {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  date: isoDate,
                  nom_recuperant: row.nom_recuperant || "",
                  nom_boss: row.nom_boss || "",
                  lieu_retrait: row.lieu_retrait || "",
                  somme: row.somme !== null && row.somme !== undefined ? row.somme : null,
                  nom_recevant: row.nom_recevant || "",
                  date_sortie: isoDateSortie,
                  somme_sortie: row.somme_sortie,
                }),
              });

              if (!postResponse.ok) {
                let errorMessage = `Erreur lors de la création de la ligne`;
                try {
                  const errorData = await postResponse.json();
                  errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                  // ignore
                }
                errors.push(errorMessage);
              }
            } else if (!response.ok) {
              let errorMessage = `Erreur lors de la mise à jour de la ligne`;
              try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
              } catch {
                // ignore
              }
              errors.push(errorMessage);
            }
          } catch (error: any) {
            errors.push(`Erreur pour la ligne: ${error.message}`);
          }
        }

        // Afficher les erreurs s'il y en a
        if (errors.length > 0) {
          toast({
            title: "Erreurs lors de l'enregistrement",
            description: errors.join("\n"),
            variant: "destructive",
          });
        }

        // Rafraîchir depuis le serveur
        const response = await fetch(getApiUrl("argent/"), {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error("Erreur lors du rafraîchissement des entrées d'argent");
        }

        const data = await response.json();
        // Reconstruire le tableau unique
        const rowsList: ArgentRow[] = [];
        const savedIdsSet = new Set<number>();

        if (Array.isArray(data)) {
          // Utiliser un Set pour éviter les doublons basés sur l'ID
          const seenIds = new Set<number>();
          data.forEach((item: any) => {
            // Ignorer les doublons
            if (seenIds.has(item.id)) {
              return;
            }
            seenIds.add(item.id);
            
            rowsList.push({
              id: item.id,
              date: item.date
                ? `${String(new Date(item.date).getDate()).padStart(2, "0")}/${String(
                    new Date(item.date).getMonth() + 1,
                  ).padStart(2, "0")}/${new Date(item.date).getFullYear()}`
                : getTodayDate(),
              nom_recuperant: item.nom_recuperant || "",
              nom_boss: item.nom_boss || "",
              lieu_retrait: item.lieu_retrait || "",
              somme: item.somme !== null && item.somme !== undefined ? Number(item.somme) : null,
              nom_recevant: item.nom_recevant || "",
              date_sortie: item.date_sortie
                ? `${String(new Date(item.date_sortie).getDate()).padStart(2, "0")}/${String(
                    new Date(item.date_sortie).getMonth() + 1,
                  ).padStart(2, "0")}/${new Date(item.date_sortie).getFullYear()}`
                : "",
              somme_sortie: item.somme_sortie !== null && item.somme_sortie !== undefined ? Number(item.somme_sortie) : null,
            });
            savedIdsSet.add(item.id);
          });
        }

        setRows(rowsList);
        setSavedIds(savedIdsSet);

        if (errors.length === 0) {
          toast({
            title: "Succès !",
            description: "Les entrées d'argent ont été enregistrées et synchronisées avec le serveur.",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer les entrées d'argent",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateCell = (id: number, field: keyof ArgentRow, value: string | number | null) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          if (field === "somme" || field === "somme_sortie") {
            const cleaned = typeof value === "string" ? value.replace(/\s/g, "").replace(",", ".") : value;
            const num =
              cleaned === "" || cleaned === null || cleaned === undefined
                ? null
                : typeof cleaned === "string"
                ? Number(cleaned)
                : cleaned;
            return { ...row, [field]: isNaN(num as number) ? null : (num as number | null) };
          }
          return { ...row, [field]: value as any };
        }
        return row;
      }),
    );
  };

  const addRow = () => {
    const newRow: ArgentRow = {
      id: nextId,
      date: getTodayDate(),
      nom_recuperant: "",
      nom_boss: "",
      lieu_retrait: "",
      somme: null,
      nom_recevant: "",
      date_sortie: "",
      somme_sortie: null,
    };
    setRows((prev) => [...prev, newRow]);
    setNextId((prev) => prev + 1);
  };

  const handleDeleteClick = (id: number) => {
    setRowToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (rowToDelete === null) {
      setDeleteDialogOpen(false);
      return;
    }

    const idToDelete = rowToDelete;
    setRowToDelete(null);
    setDeleteDialogOpen(false);

    try {
      const response = await fetch(getApiUrl(`argent/${idToDelete}/`), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok && response.status !== 204) {
        let errorMessage = "Erreur lors de la suppression";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }

      setRows((prev) => prev.filter((r) => r.id !== idToDelete));

      toast({
        title: "Supprimé",
        description: "La ligne a été supprimée.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer cette ligne",
        variant: "destructive",
      });
    }
  };

  const totalGeneral = rows.reduce((sum, row) => sum + (row.somme || 0), 0);
  const totalSortie = rows.reduce((sum, row) => sum + (row.somme_sortie || 0), 0);
  const totalRestant = totalGeneral - totalSortie;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 mb-1">
          <PageHeader
            title="Argent"
            description="Enregistrement des entrées d'argent"
            icon={Receipt}
            action={
              <div className="flex gap-2">
                {/* Boss : bouton actif seulement s'il y a des lignes ; Agent : toujours actif tant qu'il n'a pas encore soumis */}
                <Button
                  onClick={handleSave}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSaving || (isBoss && rows.length === 0) || (!isBoss && !isAgent)}
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
                <Button variant="secondary" onClick={() => navigate(-1)} className="gap-2">
                  <ArrowLeft size={16} />
                  Retour
                </Button>
              </div>
            }
          />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 -mt-3">
          {isLoading ? (
            <div className="bg-card rounded-xl border border-border p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Chargement des entrées d'argent...</span>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex-1 flex flex-col min-h-0 h-full">
              {/* Vue AGENT : un seul tableau unifié (comme le boss) */}
              {isAgent && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted sticky top-0 z-20">
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-center font-semibold text-xl text-card-foreground w-[50px] bg-muted">
                            N°
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[120px] bg-muted">
                            Date
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-muted">
                            Nom de Récupérant
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-muted">
                            Nom du boss
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-muted">
                            Lieu de retrait
                          </th>
                          <th className="border-r-4 border-gray-600 dark:border-gray-400 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[160px] bg-muted">
                            Somme rentrée
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-red-100 dark:bg-red-950/40">
                            Nom de Recevant
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[160px] bg-red-100 dark:bg-red-950/40">
                            Somme sortie
                          </th>
                          <th className="px-0.5 py-2 text-center font-semibold text-xl text-card-foreground w-7 bg-muted">
                            #
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-gray-400 dark:border-gray-600">
                          <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center font-medium text-2xl text-foreground">
                            1
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                            <Input
                              type="text"
                              value={agentDate || ""}
                              onChange={(e) => setAgentDate(e.target.value)}
                              onBlur={(e) => {
                                if (!e.target.value.trim()) {
                                  setAgentDate(getTodayDate());
                                }
                              }}
                              className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                            <Input
                              type="text"
                              value={agentNomRecuperant || ""}
                              onChange={(e) => setAgentNomRecuperant(e.target.value)}
                              className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                            <Input
                              type="text"
                              value={agentNomBoss || ""}
                              onChange={(e) => setAgentNomBoss(e.target.value)}
                              className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                            <Input
                              type="text"
                              value={agentLieuRetrait || ""}
                              onChange={(e) => setAgentLieuRetrait(e.target.value)}
                              className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </td>
                          <td className="border-r-4 border-gray-600 dark:border-gray-400 p-0">
                            <div className="flex items-center gap-1 px-1">
                              <Input
                                type="text"
                                value={agentSomme !== null && agentSomme !== undefined ? formatNumber(agentSomme) : ""}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                  if (!cleaned) {
                                    setAgentSomme(null);
                                  } else {
                                    const num = Number(cleaned);
                                    setAgentSomme(isNaN(num) ? null : num);
                                  }
                                }}
                                className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 text-right font-medium text-foreground flex-1"
                                style={{ fontSize: "1.4rem" }}
                              />
                              {agentSomme !== null && agentSomme !== undefined && agentSomme > 0 && (
                                <span className="text-xl font-medium text-foreground">F</span>
                              )}
                            </div>
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0 bg-red-50 dark:bg-red-950/20">
                            <Input
                              type="text"
                              value={agentNomRecevant || ""}
                              onChange={(e) => setAgentNomRecevant(e.target.value)}
                              className="border-0 rounded-none h-11 bg-transparent focus:bg-red-100 dark:focus:bg-red-950/30 font-medium text-foreground"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0 bg-red-50 dark:bg-red-950/20">
                            <div className="flex items-center gap-1 px-1">
                              <Input
                                type="text"
                                value={agentSommeSortie !== null && agentSommeSortie !== undefined ? formatNumber(agentSommeSortie) : ""}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                  if (!cleaned) {
                                    setAgentSommeSortie(null);
                                  } else {
                                    const num = Number(cleaned);
                                    setAgentSommeSortie(isNaN(num) ? null : num);
                                  }
                                }}
                                className="border-0 rounded-none h-11 bg-transparent focus:bg-red-100 dark:focus:bg-red-950/30 text-right font-medium text-foreground flex-1"
                                style={{ fontSize: "1.4rem" }}
                              />
                              {agentSommeSortie !== null && agentSommeSortie !== undefined && agentSommeSortie > 0 && (
                                <span className="text-xl font-medium text-foreground">F</span>
                              )}
                            </div>
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setAgentDate(getTodayDate());
                                setAgentNomRecuperant("");
                                setAgentNomBoss("");
                                setAgentLieuRetrait("");
                                setAgentSomme(null);
                                setAgentNomRecevant("");
                                setAgentDateSortie(getTodayDate());
                                setAgentSommeSortie(null);
                              }}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center justify-center"
                              title="Effacer"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Vue BOSS : un seul tableau unifié */}
              {isBoss && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted sticky top-0 z-20">
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-center font-semibold text-xl text-card-foreground w-[50px] bg-muted">
                            N°
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[120px] bg-muted">
                            Date
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-muted">
                            Nom de Récupérant
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-muted">
                            Nom du boss
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-muted">
                            Lieu de retrait
                          </th>
                          <th className="border-r-4 border-gray-600 dark:border-gray-400 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[160px] bg-muted">
                            Somme rentrée
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-red-100 dark:bg-red-950/40">
                            Nom de Recevant
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[160px] bg-red-100 dark:bg-red-950/40">
                            Somme sortie
                          </th>
                          <th className="px-0.5 py-2 text-center font-semibold text-xl text-card-foreground w-7 bg-muted">
                            #
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                              Aucune ligne. Cliquez sur le bouton + pour ajouter une ligne.
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, index) => (
                              <tr
                                key={row.id}
                                className="border-t border-gray-400 dark:border-gray-600 transition-colors hover:bg-muted/20"
                              >
                                <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center font-medium text-2xl text-foreground">
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
                                    className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                    style={{ fontSize: "1.25rem" }}
                                  />
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                                  <Input
                                    type="text"
                                    value={row.nom_recuperant || ""}
                                    onChange={(e) => updateCell(row.id, "nom_recuperant", e.target.value)}
                                    className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                    style={{ fontSize: "1.25rem" }}
                                  />
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                                  <Input
                                    type="text"
                                    value={row.nom_boss || ""}
                                    onChange={(e) => updateCell(row.id, "nom_boss", e.target.value)}
                                    className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                    style={{ fontSize: "1.25rem" }}
                                  />
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                                  <Input
                                    type="text"
                                    value={row.lieu_retrait || ""}
                                    onChange={(e) => updateCell(row.id, "lieu_retrait", e.target.value)}
                                    className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                    style={{ fontSize: "1.25rem" }}
                                  />
                                </td>
                                <td className="border-r-4 border-gray-600 dark:border-gray-400 p-0">
                                  <div className="flex items-center gap-1 px-1">
                                    <Input
                                      type="text"
                                      value={row.somme !== null && row.somme !== undefined ? formatNumber(row.somme) : ""}
                                      onChange={(e) => updateCell(row.id, "somme", e.target.value)}
                                      className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 text-right font-medium text-foreground flex-1"
                                      style={{ fontSize: "1.4rem" }}
                                    />
                                    {row.somme !== null && row.somme !== undefined && row.somme > 0 && (
                                      <span className="text-xl font-medium text-foreground">F</span>
                                    )}
                                  </div>
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 p-0 bg-red-50 dark:bg-red-950/20">
                                  <Input
                                    type="text"
                                    value={row.nom_recevant || ""}
                                    onChange={(e) => updateCell(row.id, "nom_recevant", e.target.value)}
                                    className="border-0 rounded-none h-11 bg-transparent focus:bg-red-100 dark:focus:bg-red-950/30 font-medium text-foreground"
                                    style={{ fontSize: "1.25rem" }}
                                  />
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 p-0 bg-red-50 dark:bg-red-950/20">
                                  <div className="flex items-center gap-1 px-1">
                                    <Input
                                      type="text"
                                      value={row.somme_sortie !== null && row.somme_sortie !== undefined ? formatNumber(row.somme_sortie) : ""}
                                      onChange={(e) => updateCell(row.id, "somme_sortie", e.target.value)}
                                      className="border-0 rounded-none h-11 bg-transparent focus:bg-red-100 dark:focus:bg-red-950/30 text-right font-medium text-foreground flex-1"
                                      style={{ fontSize: "1.4rem" }}
                                    />
                                    {row.somme_sortie !== null && row.somme_sortie !== undefined && row.somme_sortie > 0 && (
                                      <span className="text-xl font-medium text-foreground">F</span>
                                    )}
                                  </div>
                                </td>
                                <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteClick(row.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center justify-center"
                                    title="Supprimer la ligne"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {rows.length > 0 && (
                          <tfoot className="border-t-4 border-gray-500 dark:border-gray-400">
                            <tr className="bg-muted/50">
                              <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3" colSpan={5} />
                              <td className="border-r-4 border-gray-600 dark:border-gray-400 px-1 py-3 text-center font-bold text-xl text-card-foreground bg-muted/20">
                                <div className="flex flex-col items-center">
                                  <span className="text-lg">Total entrées :</span>
                                  <span className="text-2xl mt-1">
                                    {formatNumber(totalGeneral)} <span className="text-lg">F</span>
                                  </span>
                                </div>
                              </td>
                              <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3 bg-red-100 dark:bg-red-950/40" />
                              <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3 text-center font-bold text-xl text-card-foreground bg-red-100 dark:bg-red-950/40">
                                <div className="flex flex-col items-center">
                                  <span className="text-lg">Total sortie :</span>
                                  <span className="text-2xl mt-1">
                                    {formatNumber(totalSortie)} <span className="text-lg">F</span>
                                  </span>
                                </div>
                              </td>
                              <td className="px-1 py-3" />
                            </tr>
                          </tfoot>
                      )}
                      </table>
                    </div>

                  {/* Total Général restant - en bas */}
                  {rows.length > 0 && (
                    <div className={`${totalRestant < 0 ? 'bg-red-100 dark:bg-red-950/30 border-2 border-red-500 dark:border-red-800' : 'bg-primary/20 dark:bg-primary/30 border-2 border-primary dark:border-primary/80'} rounded-lg shadow-md px-4 py-3 text-center my-3 mx-4`}>
                      <span className={`font-bold text-2xl ${totalRestant < 0 ? 'text-red-600 dark:text-red-400' : 'text-primary dark:text-primary-foreground'}`}>
                        Total Général restant : {formatNumber(totalRestant)} <span className="text-xl">F</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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

        {/* Boutons flottants pour ajouter des lignes */}
        {(isBoss || isAgent) && (
          <>
            <Button
              onClick={isBoss ? addRow : () => {}}
              className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg gap-2 z-50"
              size="icon"
              title="Ajouter une ligne"
            >
              <Plus size={24} />
            </Button>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}


