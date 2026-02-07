import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Truck, Plus, Loader2, ArrowLeft, Trash2, Save } from "lucide-react";
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

interface TransiteurRow {
  id: number;
  date: string;
  nom_produit: string;
  numero_camion: string;
  numero_chauffeur: string;
  ville_depart: string;
  ville_arrivant: string;
  depenses: number | null;
  argent_donne: number | null;
  total_restant: number | null;
}

const TYPES_DENREE_PREDEFINIS = ["Anacarde", "Karité", "Sesame", "Soza", "Mais"];

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

export default function Transiteur() {
  const [rows, setRows] = useState<TransiteurRow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [agentDate, setAgentDate] = useState<string>(getTodayDate());
  const [agentNomProduit, setAgentNomProduit] = useState<string>("");
  const [agentNumeroCamion, setAgentNumeroCamion] = useState<string>("");
  const [agentNumeroChauffeur, setAgentNumeroChauffeur] = useState<string>("");
  const [agentVilleDepart, setAgentVilleDepart] = useState<string>("");
  const [agentVilleArrivant, setAgentVilleArrivant] = useState<string>("");
  const [agentDepenses, setAgentDepenses] = useState<number | null>(null);
  const [agentArgentDonne, setAgentArgentDonne] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { user, token } = useAuth();
  const isBoss = user?.role === "boss";
  const isAgent = user?.role === "agent";

  // Calculer le total restant pour chaque ligne
  const calculateTotalRestant = (depenses: number | null, argentDonne: number | null): number | null => {
    if (depenses === null && argentDonne === null) return null;
    const dep = depenses || 0;
    const argent = argentDonne || 0;
    return argent - dep;
  };

  useEffect(() => {
    setIsLoading(true);
    const fetchRows = async () => {
      try {
        const response = await fetch(getApiUrl("transiteur/"), {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          // Si l'endpoint n'existe pas encore, on continue avec un tableau vide
          if (response.status === 404) {
            setRows([]);
            setSavedIds(new Set());
            setNextId(1);
            setIsLoading(false);
            return;
          }
          throw new Error("Erreur lors du chargement des données transiteur");
        }

        const data = await response.json();
        const rowsList: TransiteurRow[] = [];
        const savedIdsSet = new Set<number>();

        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const depenses = item.depenses !== null && item.depenses !== undefined ? Number(item.depenses) : null;
            const argentDonne = item.argent_donne !== null && item.argent_donne !== undefined ? Number(item.argent_donne) : null;
            rowsList.push({
              id: item.id,
              date: item.date
                ? `${String(new Date(item.date).getDate()).padStart(2, "0")}/${String(
                    new Date(item.date).getMonth() + 1,
                  ).padStart(2, "0")}/${new Date(item.date).getFullYear()}`
                : getTodayDate(),
              nom_produit: item.nom_produit || "",
              numero_camion: item.numero_camion || "",
              numero_chauffeur: item.numero_chauffeur || "",
              ville_depart: item.ville_depart || "",
              ville_arrivant: item.ville_arrivant || "",
              depenses: depenses,
              argent_donne: argentDonne,
              total_restant: calculateTotalRestant(depenses, argentDonne),
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
          description: error.message || "Impossible de charger les données transiteur",
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

    try {
      // Cas agent : enregistrement d'une seule nouvelle entrée via l'API
      if (isAgent) {
        const hasAnyData = 
          (agentDepenses !== null && agentDepenses !== undefined) ||
          (agentArgentDonne !== null && agentArgentDonne !== undefined);
        
        if (!hasAnyData) {
          toast({
            title: "Champs manquants",
            description: "Veuillez remplir au moins une valeur (dépenses ou argent donné).",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }

        const today = getTodayDate();
        const [day, month, year] = (agentDate || today).split("/");
        const isoDate = `${year}-${month}-${day}`;

        const response = await fetch(getApiUrl("transiteur/"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            date: isoDate,
            nom_produit: agentNomProduit || "",
            numero_camion: agentNumeroCamion || "",
            numero_chauffeur: agentNumeroChauffeur || "",
            ville_depart: agentVilleDepart || "",
            ville_arrivant: agentVilleArrivant || "",
            depenses: agentDepenses !== null && agentDepenses !== undefined ? agentDepenses : null,
            argent_donne: agentArgentDonne !== null && agentArgentDonne !== undefined ? agentArgentDonne : null,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Erreur lors de l'enregistrement";
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch {
            // ignore
          }
          throw new Error(errorMessage);
        }

        const created = await response.json();
        const totalRestant = calculateTotalRestant(created.depenses, created.argent_donne);

        setRows((prev) => {
          if (prev.some((r) => r.id === created.id)) {
            return prev.map((r) => (r.id === created.id ? {
              id: created.id,
              date: agentDate || getTodayDate(),
              nom_produit: agentNomProduit || "",
              numero_camion: agentNumeroCamion || "",
              numero_chauffeur: agentNumeroChauffeur || "",
              ville_depart: agentVilleDepart || "",
              ville_arrivant: agentVilleArrivant || "",
              depenses: agentDepenses,
              argent_donne: agentArgentDonne,
              total_restant: totalRestant,
            } : r));
          }
          return [...prev, {
            id: created.id,
            date: agentDate || getTodayDate(),
            nom_produit: agentNomProduit || "",
            numero_camion: agentNumeroCamion || "",
            numero_chauffeur: agentNumeroChauffeur || "",
            ville_depart: agentVilleDepart || "",
            ville_arrivant: agentVilleArrivant || "",
            depenses: agentDepenses,
            argent_donne: agentArgentDonne,
            total_restant: totalRestant,
          }];
        });
        setSavedIds((prev) => new Set([...prev, created.id]));

        // Réinitialiser les champs agent
        setAgentDate(getTodayDate());
        setAgentNomProduit("");
        setAgentNumeroCamion("");
        setAgentNumeroChauffeur("");
        setAgentVilleDepart("");
        setAgentVilleArrivant("");
        setAgentDepenses(null);
        setAgentArgentDonne(null);

        toast({
          title: "Enregistré",
          description: "Votre entrée a été enregistrée. Vous pouvez saisir une nouvelle entrée.",
        });
      } else if (isBoss) {
        // Cas boss : sauvegarder toutes les modifications du tableau
        const errors: string[] = [];
        
        const newRows = rows.filter((row) => {
          if (savedIds.has(row.id)) return false;
          const hasAnyData = 
            (row.depenses !== null && row.depenses !== undefined) ||
            (row.argent_donne !== null && row.argent_donne !== undefined);
          return hasAnyData;
        });
        const existingRows = rows.filter((row) => savedIds.has(row.id));

        // Sauvegarder les nouvelles lignes (POST)
        for (const row of newRows) {
          try {
            const today = getTodayDate();
            const dateToUse = row.date || today;
            const [day, month, year] = dateToUse.split("/");
            const isoDate = `${year}-${month}-${day}`;

            const response = await fetch(getApiUrl("transiteur/"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                date: isoDate,
                nom_produit: row.nom_produit || "",
                numero_camion: row.numero_camion || "",
                numero_chauffeur: row.numero_chauffeur || "",
                ville_depart: row.ville_depart || "",
                ville_arrivant: row.ville_arrivant || "",
                depenses: row.depenses !== null && row.depenses !== undefined ? row.depenses : null,
                argent_donne: row.argent_donne !== null && row.argent_donne !== undefined ? row.argent_donne : null,
              }),
            });

            if (!response.ok) {
              let errorMessage = `Erreur lors de l'enregistrement de la ligne`;
              try {
                const errorData = await response.json();
                if (errorData.non_field_errors) {
                  errorMessage = Array.isArray(errorData.non_field_errors)
                    ? errorData.non_field_errors.join(", ")
                    : errorData.non_field_errors;
                } else if (errorData.detail) {
                  errorMessage = errorData.detail;
                } else if (errorData.message) {
                  errorMessage = errorData.message;
                } else {
                  const fieldErrors = Object.entries(errorData)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value[0] : value}`)
                    .join(", ");
                  if (fieldErrors) {
                    errorMessage = fieldErrors;
                  }
                }
              } catch (e) {
                errorMessage = `Erreur ${response.status}: ${response.statusText}`;
              }
              errors.push(errorMessage);
            }
          } catch (error: any) {
            errors.push(`Erreur pour la ligne: ${error.message}`);
          }
        }

        // Mettre à jour les lignes existantes (PUT)
        for (const row of existingRows) {
          try {
            const today = getTodayDate();
            const dateToUse = row.date || today;
            const [day, month, year] = dateToUse.split("/");
            const isoDate = `${year}-${month}-${day}`;

            const response = await fetch(getApiUrl(`transiteur/${row.id}/`), {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                date: isoDate,
                nom_produit: row.nom_produit || "",
                numero_camion: row.numero_camion || "",
                numero_chauffeur: row.numero_chauffeur || "",
                ville_depart: row.ville_depart || "",
                ville_arrivant: row.ville_arrivant || "",
                depenses: row.depenses !== null && row.depenses !== undefined ? row.depenses : null,
                argent_donne: row.argent_donne !== null && row.argent_donne !== undefined ? row.argent_donne : null,
              }),
            });

            if (response.status === 404) {
              const postResponse = await fetch(getApiUrl("transiteur/"), {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  date: isoDate,
                  numero_camion: row.numero_camion || "",
                  numero_chauffeur: row.numero_chauffeur || "",
                  ville_depart: row.ville_depart || "",
                  ville_arrivant: row.ville_arrivant || "",
                  depenses: row.depenses !== null && row.depenses !== undefined ? row.depenses : null,
                  argent_donne: row.argent_donne !== null && row.argent_donne !== undefined ? row.argent_donne : null,
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

        if (errors.length > 0) {
          toast({
            title: "Erreurs lors de l'enregistrement",
            description: errors.join("\n"),
            variant: "destructive",
          });
        }

        // Rafraîchir depuis le serveur
        const response = await fetch(getApiUrl("transiteur/"), {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok && response.status !== 404) {
          throw new Error("Erreur lors du rafraîchissement des données");
        }

        if (response.ok) {
          const data = await response.json();
          const rowsList: TransiteurRow[] = [];
          const savedIdsSet = new Set<number>();

          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              const depenses = item.depenses !== null && item.depenses !== undefined ? Number(item.depenses) : null;
              const argentDonne = item.argent_donne !== null && item.argent_donne !== undefined ? Number(item.argent_donne) : null;
              rowsList.push({
                id: item.id,
                date: item.date
                  ? `${String(new Date(item.date).getDate()).padStart(2, "0")}/${String(
                      new Date(item.date).getMonth() + 1,
                    ).padStart(2, "0")}/${new Date(item.date).getFullYear()}`
                  : getTodayDate(),
                numero_camion: item.numero_camion || "",
                numero_chauffeur: item.numero_chauffeur || "",
                ville_depart: item.ville_depart || "",
                ville_arrivant: item.ville_arrivant || "",
                depenses: depenses,
                argent_donne: argentDonne,
                total_restant: calculateTotalRestant(depenses, argentDonne),
              });
              savedIdsSet.add(item.id);
            });
          }

          setRows(rowsList);
          setSavedIds(savedIdsSet);
        }

        if (errors.length === 0) {
          toast({
            title: "Succès !",
            description: "Les données ont été enregistrées et synchronisées avec le serveur.",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer les données",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateCell = (id: number, field: keyof TransiteurRow, value: string | number | null) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updated = { ...row };
          if (field === "depenses" || field === "argent_donne") {
            const cleaned = typeof value === "string" ? value.replace(/\s/g, "").replace(",", ".") : value;
            const num =
              cleaned === "" || cleaned === null || cleaned === undefined
                ? null
                : typeof cleaned === "string"
                ? Number(cleaned)
                : cleaned;
            updated[field] = isNaN(num as number) ? null : (num as number | null);
          } else {
            updated[field] = value as any;
          }
          // Recalculer le total restant
          updated.total_restant = calculateTotalRestant(updated.depenses, updated.argent_donne);
          return updated;
        }
        return row;
      }),
    );
  };

  const addRow = () => {
    const newRow: TransiteurRow = {
      id: nextId,
      date: getTodayDate(),
      nom_produit: "",
      numero_camion: "",
      numero_chauffeur: "",
      ville_depart: "",
      ville_arrivant: "",
      depenses: null,
      argent_donne: null,
      total_restant: null,
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
      const response = await fetch(getApiUrl(`transiteur/${idToDelete}/`), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok && response.status !== 404 && response.status !== 204) {
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
      setSavedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(idToDelete);
        return newSet;
      });

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

  const totalDepenses = rows.reduce((sum, row) => sum + (row.depenses || 0), 0);
  const totalArgentDonne = rows.reduce((sum, row) => sum + (row.argent_donne || 0), 0);
  const totalRestant = totalArgentDonne - totalDepenses;

  return (
    <DashboardLayout>
      <datalist id="types-denree">
        {TYPES_DENREE_PREDEFINIS.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 mb-1">
          <PageHeader
            title="Transiteur"
            icon={Truck}
            action={
              <div className="flex gap-2">
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
              <span className="ml-3 text-muted-foreground">Chargement des données...</span>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex-1 flex flex-col min-h-0 h-full">
              {/* Vue AGENT */}
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
                            Nom produit
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[120px] bg-muted">
                            N° Camion
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[120px] bg-muted">
                            N° Chauffeur
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-muted">
                            Ville départ
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-muted">
                            Ville partant
                          </th>
                          <th className="border-r-4 border-gray-600 dark:border-gray-400 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[180px] bg-muted">
                            Dépenses camion
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[180px] bg-red-100 dark:bg-red-950/40">
                            Argent donné
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
                              list="types-denree"
                              value={agentNomProduit || ""}
                              onChange={(e) => setAgentNomProduit(e.target.value)}
                              className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                            <Input
                              type="text"
                              value={agentNumeroCamion || ""}
                              onChange={(e) => setAgentNumeroCamion(e.target.value)}
                              className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                            <Input
                              type="text"
                              value={agentNumeroChauffeur || ""}
                              onChange={(e) => setAgentNumeroChauffeur(e.target.value)}
                              className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                            <Input
                              type="text"
                              value={agentVilleDepart || ""}
                              onChange={(e) => setAgentVilleDepart(e.target.value)}
                              className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                            <Input
                              type="text"
                              value={agentVilleArrivant || ""}
                              onChange={(e) => setAgentVilleArrivant(e.target.value)}
                              className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                              style={{ fontSize: "1.25rem" }}
                            />
                          </td>
                          <td className="border-r-4 border-gray-600 dark:border-gray-400 p-0">
                            <div className="flex items-center gap-1 px-1">
                              <Input
                                type="text"
                                value={agentDepenses !== null && agentDepenses !== undefined ? formatNumber(agentDepenses) : ""}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                  if (!cleaned) {
                                    setAgentDepenses(null);
                                  } else {
                                    const num = Number(cleaned);
                                    setAgentDepenses(isNaN(num) ? null : num);
                                  }
                                }}
                                className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 text-right font-medium text-foreground flex-1"
                                style={{ fontSize: "1.4rem" }}
                              />
                              {agentDepenses !== null && agentDepenses !== undefined && agentDepenses > 0 && (
                                <span className="text-xl font-medium text-foreground">F</span>
                              )}
                            </div>
                          </td>
                          <td className="border-r border-gray-400 dark:border-gray-600 p-0 bg-red-50 dark:bg-red-950/20">
                            <div className="flex items-center gap-1 px-1">
                              <Input
                                type="text"
                                value={agentArgentDonne !== null && agentArgentDonne !== undefined ? formatNumber(agentArgentDonne) : ""}
                                onChange={(e) => {
                                  const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                  if (!cleaned) {
                                    setAgentArgentDonne(null);
                                  } else {
                                    const num = Number(cleaned);
                                    setAgentArgentDonne(isNaN(num) ? null : num);
                                  }
                                }}
                                className="border-0 rounded-none h-11 bg-transparent focus:bg-red-100 dark:focus:bg-red-950/30 text-right font-medium text-foreground flex-1"
                                style={{ fontSize: "1.4rem" }}
                              />
                              {agentArgentDonne !== null && agentArgentDonne !== undefined && agentArgentDonne > 0 && (
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
                                setAgentNomProduit("");
                                setAgentNumeroCamion("");
                                setAgentNumeroChauffeur("");
                                setAgentVilleDepart("");
                                setAgentVilleArrivant("");
                                setAgentDepenses(null);
                                setAgentArgentDonne(null);
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

              {/* Vue BOSS */}
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
                            Nom produit
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[120px] bg-muted">
                            N° Camion
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[120px] bg-muted">
                            N° Chauffeur
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-muted">
                            Ville départ
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[150px] bg-muted">
                            Ville partant
                          </th>
                          <th className="border-r-4 border-gray-600 dark:border-gray-400 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[180px] bg-muted">
                            Dépenses camion
                          </th>
                          <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[180px] bg-red-100 dark:bg-red-950/40">
                            Argent donné
                          </th>
                          <th className="px-0.5 py-2 text-center font-semibold text-xl text-card-foreground w-7 bg-muted">
                            #
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
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
                                  list="types-denree"
                                  value={row.nom_produit || ""}
                                  onChange={(e) => updateCell(row.id, "nom_produit", e.target.value)}
                                  className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                  style={{ fontSize: "1.25rem" }}
                                />
                              </td>
                              <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                                <Input
                                  type="text"
                                  value={row.numero_camion || ""}
                                  onChange={(e) => updateCell(row.id, "numero_camion", e.target.value)}
                                  className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                  style={{ fontSize: "1.25rem" }}
                                />
                              </td>
                              <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                                <Input
                                  type="text"
                                  value={row.numero_chauffeur || ""}
                                  onChange={(e) => updateCell(row.id, "numero_chauffeur", e.target.value)}
                                  className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                  style={{ fontSize: "1.25rem" }}
                                />
                              </td>
                              <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                                <Input
                                  type="text"
                                  value={row.ville_depart || ""}
                                  onChange={(e) => updateCell(row.id, "ville_depart", e.target.value)}
                                  className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                  style={{ fontSize: "1.25rem" }}
                                />
                              </td>
                              <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                                <Input
                                  type="text"
                                  value={row.ville_arrivant || ""}
                                  onChange={(e) => updateCell(row.id, "ville_arrivant", e.target.value)}
                                  className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                  style={{ fontSize: "1.25rem" }}
                                />
                              </td>
                              <td className="border-r-4 border-gray-600 dark:border-gray-400 p-0">
                                <div className="flex items-center gap-1 px-1">
                                  <Input
                                    type="text"
                                    value={row.depenses !== null && row.depenses !== undefined ? formatNumber(row.depenses) : ""}
                                    onChange={(e) => updateCell(row.id, "depenses", e.target.value)}
                                    className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 text-right font-medium text-foreground flex-1"
                                    style={{ fontSize: "1.4rem" }}
                                  />
                                  {row.depenses !== null && row.depenses !== undefined && row.depenses > 0 && (
                                    <span className="text-xl font-medium text-foreground">F</span>
                                  )}
                                </div>
                              </td>
                              <td className="border-r border-gray-400 dark:border-gray-600 p-0 bg-red-50 dark:bg-red-950/20">
                                <div className="flex items-center gap-1 px-1">
                                  <Input
                                    type="text"
                                    value={row.argent_donne !== null && row.argent_donne !== undefined ? formatNumber(row.argent_donne) : ""}
                                    onChange={(e) => updateCell(row.id, "argent_donne", e.target.value)}
                                    className="border-0 rounded-none h-11 bg-transparent focus:bg-red-100 dark:focus:bg-red-950/30 text-right font-medium text-foreground flex-1"
                                    style={{ fontSize: "1.4rem" }}
                                  />
                                  {row.argent_donne !== null && row.argent_donne !== undefined && row.argent_donne > 0 && (
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
                            <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3" colSpan={7} />
                            <td className="border-r-4 border-gray-600 dark:border-gray-400 px-1 py-3 text-center font-bold text-xl text-card-foreground bg-muted/20">
                              <div className="flex flex-col items-center">
                                <span className="text-lg">Total dépenses :</span>
                                <span className="text-2xl mt-1">
                                  {formatNumber(totalDepenses)} <span className="text-lg">F</span>
                                </span>
                              </div>
                            </td>
                            <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3 text-center font-bold text-xl text-card-foreground bg-red-100 dark:bg-red-950/40">
                              <div className="flex flex-col items-center">
                                <span className="text-lg">Total argent donné :</span>
                                <span className="text-2xl mt-1">
                                  {formatNumber(totalArgentDonne)} <span className="text-lg">F</span>
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
        {isBoss && (
          <Button
            onClick={addRow}
            className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg gap-2 z-50"
            size="icon"
            title="Ajouter une ligne"
          >
            <Plus size={24} />
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
}

