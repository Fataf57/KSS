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

interface ArgentRow {
  id: number;
  date: string;
  nom: string;
  lieu_retrait: string;
  somme: number | null;
}

const STORAGE_KEY = "argent_rows";

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
  const [agentNom, setAgentNom] = useState<string>("");
  const [agentLieuRetrait, setAgentLieuRetrait] = useState<string>("");
  const [agentSomme, setAgentSomme] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isBoss = user?.role === "boss";
  const isAgent = user?.role === "agent";

  useEffect(() => {
    setIsLoading(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ArgentRow[] = JSON.parse(saved);
        setRows(parsed);
        const maxId = parsed.length > 0 ? Math.max(...parsed.map((r) => r.id)) : 0;
        setNextId(maxId + 1);
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de charger les anciennes entrées d'argent",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (rows.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [rows]);

  const handleSave = () => {
    try {
      setIsSaving(true);
      const today = getTodayDate();

      // Cas agent : une seule ligne de saisie, mais peut enregistrer plusieurs entrées au fur et à mesure
      if (isAgent) {
        if (!agentNom.trim() || !agentLieuRetrait.trim() || agentSomme === null) {
          toast({
            title: "Champs manquants",
            description: "Veuillez remplir tous les champs avant d'enregistrer.",
            variant: "destructive",
          });
          return;
        }

        const newRow: ArgentRow = {
          id: nextId,
          date: agentDate || today,
          nom: agentNom,
          lieu_retrait: agentLieuRetrait,
          somme: agentSomme,
        };

        const updatedRows = [...rows, newRow];
        setRows(updatedRows);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRows));

        // On réinitialise la ligne agent pour permettre une nouvelle saisie
        setAgentDate(getTodayDate());
        setAgentNom("");
        setAgentLieuRetrait("");
        setAgentSomme(null);

        toast({
          title: "Enregistré",
          description: "Votre entrée d'argent a été enregistrée. Vous pouvez saisir une nouvelle entrée.",
        });
      } else {
        // Cas boss : enregistrement de tout le tableau
        if (rows.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        toast({
          title: "Succès !",
          description: "Les entrées d'argent ont été enregistrées.",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateCell = (id: number, field: keyof ArgentRow, value: string | number | null) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          if (field === "somme") {
            const cleaned = typeof value === "string" ? value.replace(/\s/g, "").replace(",", ".") : value;
            const num =
              cleaned === "" || cleaned === null || cleaned === undefined
                ? null
                : typeof cleaned === "string"
                ? Number(cleaned)
                : cleaned;
            return { ...row, somme: isNaN(num as number) ? null : (num as number | null) };
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
      nom: "",
      lieu_retrait: "",
      somme: null,
    };
    setRows((prev) => [...prev, newRow]);
    setNextId((prev) => prev + 1);

    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleDeleteClick = (id: number) => {
    setRowToDelete(id);
    setDeleteDialogOpen(true);
  };

  const deleteRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDeleteConfirm = () => {
    if (rowToDelete !== null) {
      deleteRow(rowToDelete);
    }
    setDeleteDialogOpen(false);
    setRowToDelete(null);
  };

  const totalGeneral = rows.reduce((sum, row) => sum + (row.somme || 0), 0);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 mb-4">
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

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {isLoading ? (
            <div className="bg-card rounded-xl border border-border p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Chargement des entrées d'argent...</span>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex-1 flex flex-col min-h-0 h-full">
              {/* Vue AGENT : même tableau mais une seule ligne de saisie, en plein écran */}
              {isAgent && (
                <div className="flex-1 flex flex-col min-h-0">
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
                            <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[200px] bg-muted">
                              Nom
                            </th>
                            <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[200px] bg-muted">
                              Lieu de retrait
                            </th>
                            <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[160px] bg-muted">
                              Somme
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
                                placeholder={getTodayDate()}
                                className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                style={{ fontSize: "1.25rem" }}
                              />
                            </td>
                            <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                              <Input
                                type="text"
                                value={agentNom || ""}
                                onChange={(e) => setAgentNom(e.target.value)}
                                placeholder="Nom"
                                className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                style={{ fontSize: "1.4rem" }}
                              />
                            </td>
                            <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                              <Input
                                type="text"
                                value={agentLieuRetrait || ""}
                                onChange={(e) => setAgentLieuRetrait(e.target.value)}
                                placeholder="Lieu de retrait"
                                className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                style={{ fontSize: "1.4rem" }}
                              />
                            </td>
                            <td className="border-r border-gray-400 dark:border-gray-600 p-0">
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
                                  placeholder="0"
                                />
                                {agentSomme !== null && agentSomme !== undefined && agentSomme > 0 && (
                                  <span className="text-xl font-medium text-foreground">F</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Vue BOSS : tableau complet avec plusieurs lignes */}
              {isBoss && (
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
                        <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[200px] bg-muted">
                          Nom
                        </th>
                        <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[200px] bg-muted">
                          Lieu de retrait
                        </th>
                        <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[160px] bg-muted">
                          Somme
                        </th>
                        <th className="px-0.5 py-2 text-center font-semibold text-xl text-card-foreground w-7 bg-muted">
                          #
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                            Aucune entrée d'argent. Cliquez sur "Nouvelle ligne" pour ajouter une ligne.
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
                                placeholder={getTodayDate()}
                                className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                style={{ fontSize: "1.25rem" }}
                              />
                            </td>
                            <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                              <Input
                                type="text"
                                value={row.nom || ""}
                                onChange={(e) => updateCell(row.id, "nom", e.target.value)}
                                placeholder="Nom"
                                className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                style={{ fontSize: "1.4rem" }}
                              />
                            </td>
                            <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                              <Input
                                type="text"
                                value={row.lieu_retrait || ""}
                                onChange={(e) => updateCell(row.id, "lieu_retrait", e.target.value)}
                                placeholder="Lieu de retrait"
                                className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 font-medium text-foreground"
                                style={{ fontSize: "1.4rem" }}
                              />
                            </td>
                            <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                              <div className="flex items-center gap-1 px-1">
                                <Input
                                  type="text"
                                  value={row.somme !== null && row.somme !== undefined ? formatNumber(row.somme) : ""}
                                  onChange={(e) => updateCell(row.id, "somme", e.target.value)}
                                  className="border-0 rounded-none h-11 bg-transparent focus:bg-accent/10 text-right font-medium text-foreground flex-1"
                                  style={{ fontSize: "1.4rem" }}
                                  placeholder="0"
                                />
                                {row.somme !== null && row.somme !== undefined && row.somme > 0 && (
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
                          <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3" />
                          <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3" />
                          <td
                            colSpan={3}
                            className="border-r border-gray-400 dark:border-gray-600 px-1 py-3 text-right font-bold text-xl text-card-foreground bg-muted/20"
                          >
                            <span className="block w-full text-right">
                              Total Général : {formatNumber(totalGeneral)} <span className="text-base">F</span>
                            </span>
                          </td>
                          <td className="px-1 py-3" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {isBoss && (
          <Button
            onClick={addRow}
            className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg gap-2 z-50"
            size="icon"
          >
            <Plus size={24} />
          </Button>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette entrée d'argent ?
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
      </div>
    </DashboardLayout>
  );
}


