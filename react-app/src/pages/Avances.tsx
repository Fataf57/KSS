import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DollarSign, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AvanceRow {
  id: number;
  date: string;
  description: string;
  avance: number;
  rembourse: number;
  restant: number;
}

const STORAGE_KEY = "avances_rows";

// Formater date jj/mm/aaaa
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

// Formater nombres avec espaces et virgule
const formatNumber = (value: number | string): string => {
  const valueStr = String(value);
  const parts = valueStr.split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (parts.length === 1 || !parts[1] || parts[1].match(/^0+$/)) {
    return integerPart;
  }
  const decimalPart = parts[1].replace(/0+$/, "");
  return decimalPart ? integerPart + "," + decimalPart : integerPart;
};

export default function Avances() {
  const [rows, setRows] = useState<AvanceRow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [remboursementMontant, setRemboursementMontant] = useState("");
  const { toast } = useToast();

  // Charger depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: AvanceRow[] = JSON.parse(saved);
        setRows(parsed);
        const maxId = parsed.length > 0 ? Math.max(...parsed.map((r) => r.id)) : 0;
        setNextId(maxId + 1);
      }
    } catch (e) {
      console.error("Erreur chargement avances:", e);
    }
  }, []);

  // Sauvegarder dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch (e) {
      console.error("Erreur sauvegarde avances:", e);
    }
  }, [rows]);

  const addRow = () => {
    const newRow: AvanceRow = {
      id: nextId,
      date: new Date().toISOString().split("T")[0],
      description: "",
      avance: 0,
      rembourse: 0,
      restant: 0,
    };
    setRows((prev) => [...prev, newRow]);
    setNextId((id) => id + 1);
  };

  const deleteRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateCell = (
    id: number,
    field: keyof AvanceRow,
    value: string | number
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated: AvanceRow = { ...row, [field]: value as any };
        // Recalcul du restant dès qu'on touche avance ou rembourse
        const avance = Number(
          field === "avance" ? value : updated.avance ?? 0
        );
        const rembourse = Number(
          field === "rembourse" ? value : updated.rembourse ?? 0
        );
        updated.restant = avance - rembourse;
        return updated;
      })
    );
  };

  const totalAvance = rows.reduce((sum, r) => sum + (r.avance || 0), 0);
  const totalRembourse = rows.reduce((sum, r) => sum + (r.rembourse || 0), 0);
  const totalRestant = rows.reduce((sum, r) => sum + (r.restant || 0), 0);

  const handleAddRemboursement = (rowId: number) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    setSelectedRowId(rowId);
    setRemboursementMontant("");
    setIsModalOpen(true);
  };

  const handleValidateRemboursement = () => {
    if (selectedRowId === null) return;

    const row = rows.find((r) => r.id === selectedRowId);
    if (!row) return;

    const montant = Number(remboursementMontant.replace(/\s/g, "").replace(",", "."));
    if (!montant || isNaN(montant) || montant <= 0) {
      toast({
        title: "Montant invalide",
        description: "Veuillez saisir un montant numérique strictement positif.",
        variant: "destructive",
      });
      return;
    }

    const nouveauTotalRembourse = row.rembourse + montant;
    const plafond = row.avance;
    const totalCorrige =
      plafond && nouveauTotalRembourse > plafond ? plafond : nouveauTotalRembourse;

    if (plafond && nouveauTotalRembourse > plafond) {
      toast({
        title: "Attention",
        description:
          "Le remboursement dépasse le montant de l'avance. Le remboursé est limité au montant de l'avance.",
      });
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === selectedRowId
          ? {
              ...r,
              rembourse: totalCorrige,
              restant: r.avance - totalCorrige,
            }
          : r
      )
    );

    setIsModalOpen(false);
    setSelectedRowId(null);
    setRemboursementMontant("");
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    try {
      // Ici on ne fait que confirmer la sauvegarde (localStorage déjà mis à jour)
      toast({
        title: "Succès !",
        description: "Avances enregistrées localement",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="flex-shrink-0 mb-4">
          <PageHeader
            title="Avances"
            description="Suivez les avances prises, les remboursements et le restant à payer"
            icon={DollarSign}
            action={
              <div className="flex gap-2">
                <Button onClick={addRow} className="gap-2">
                  <Plus size={16} />
                  Nouvelle avance
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSaveAll}
                  className="gap-2"
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
          <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex-1 flex flex-col min-h-0 h-full">
            <div className="overflow-auto flex-1 min-h-0 h-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted sticky top-0 z-20">
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-center font-semibold text-xl text-card-foreground w-[50px] bg-muted">
                      N°
                    </th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-lg text-card-foreground min-w-[120px] bg-muted">
                      Date
                    </th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-left font-semibold text-xl text-card-foreground min-w-[220px] bg-muted">
                      Nom Crédit
                    </th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[140px] bg-muted">
                      Avance prise
                    </th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[140px] bg-muted">
                      Remboursé
                    </th>
                    <th className="border-r border-gray-400 dark:border-gray-600 px-1 py-2 text-right font-semibold text-xl text-card-foreground min-w-[140px] bg-muted">
                      Restant
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
                        colSpan={7}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        Aucune avance enregistrée. Cliquez sur "Nouvelle avance"
                        pour ajouter une ligne.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr
                        key={row.id}
                        className="border-t border-gray-400 dark:border-gray-600 hover:bg-muted/20 transition-colors"
                      >
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center font-medium text-xl text-foreground">
                          {index + 1}
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <Input
                            type="date"
                            value={row.date}
                            onChange={(e) =>
                              updateCell(row.id, "date", e.target.value)
                            }
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-lg md:text-lg font-medium text-foreground"
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <Input
                            type="text"
                            value={row.description}
                            onChange={(e) =>
                              updateCell(row.id, "description", e.target.value)
                            }
                            placeholder="Nom du crédit"
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-xl md:text-xl font-medium text-foreground"
                          />
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <Input
                            type="text"
                            value={row.avance ? formatNumber(row.avance) : ""}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                              const num = cleaned === "" ? 0 : Number(cleaned);
                              updateCell(
                                row.id,
                                "avance",
                                isNaN(num) ? 0 : num
                              );
                            }}
                            className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground"
                            placeholder="0"
                          />
                          {row.avance > 0 && (
                            <span className="text-xs text-muted-foreground mr-2">F</span>
                          )}
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 p-0">
                          <div className="flex items-center">
                            <Input
                              type="text"
                              value={row.rembourse ? formatNumber(row.rembourse) : ""}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                                const num = cleaned === "" ? 0 : Number(cleaned);
                                updateCell(
                                  row.id,
                                  "rembourse",
                                  isNaN(num) ? 0 : num
                                );
                              }}
                              className="flex-1 border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right text-xl md:text-xl font-medium text-foreground"
                              placeholder="0"
                            />
                            {row.rembourse > 0 && (
                              <span className="text-xs text-muted-foreground">F</span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAddRemboursement(row.id)}
                              className="h-10 w-10 ml-1 text-accent hover:text-accent hover:bg-accent/10 text-2xl font-bold"
                              title="Ajouter un remboursement"
                            >
                              +
                            </Button>
                          </div>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-right font-medium text-xl bg-muted/20">
                          <span className="block w-full text-right text-lg">
                            {formatNumber(row.restant || 0)}{" "}
                            <span className="text-base">F</span>
                          </span>
                        </td>
                        <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-1 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRow(row.id)}
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-400 dark:border-gray-600 bg-muted/50">
                      <td
                        colSpan={3}
                        className="border-r border-gray-400 dark:border-gray-600 px-1 py-3 text-right font-bold text-lg text-card-foreground"
                      >
                        Totaux :
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3 text-right font-bold text-xl text-card-foreground bg-muted/20">
                        <span className="block w-full text-right text-lg">
                          {formatNumber(totalAvance)}{" "}
                          <span className="text-base">F</span>
                        </span>
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3 text-right font-bold text-xl text-card-foreground bg-muted/20">
                        <span className="block w-full text-right text-lg">
                          {formatNumber(totalRembourse)}{" "}
                          <span className="text-base">F</span>
                        </span>
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-1 py-3 text-right font-extrabold text-xl text-black dark:text-white bg-muted/30">
                        <span className="block w-full text-right text-lg">
                          Restant : {formatNumber(totalRestant)}{" "}
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
        </div>
      </div>

      {/* Modal pour ajouter un remboursement */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ajouter un remboursement</DialogTitle>
          </DialogHeader>
          {selectedRowId !== null && (
            <div className="grid gap-4 py-4">
              {(() => {
                const row = rows.find((r) => r.id === selectedRowId);
                if (!row) return null;
                return (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="description">Nom Crédit</Label>
                      <div className="text-sm text-muted-foreground">
                        {row.description || "Sans nom"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="avance">Avance totale</Label>
                        <div className="text-sm font-medium">
                          {formatNumber(row.avance)} F
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deja-rembourse">Déjà remboursé</Label>
                        <div className="text-sm font-medium">
                          {formatNumber(row.rembourse)} F
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="montant">Montant du remboursement</Label>
                      <Input
                        id="montant"
                        type="text"
                        value={remboursementMontant ? formatNumber(remboursementMontant.replace(/\s/g, "").replace(",", ".")) : ""}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\s/g, "").replace(",", ".");
                          setRemboursementMontant(cleaned);
                        }}
                        placeholder="0"
                        className="text-lg"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleValidateRemboursement();
                          }
                        }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Restant après ce remboursement :{" "}
                      <span className="font-semibold">
                        {formatNumber(
                          Math.max(
                            0,
                            row.avance -
                              row.rembourse -
                              (Number(remboursementMontant.replace(/\s/g, "").replace(",", ".")) || 0)
                          )
                        )}{" "}
                        F
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedRowId(null);
                setRemboursementMontant("");
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleValidateRemboursement}>
              Ajouter le remboursement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}


