import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShoppingCart, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface VenteRow {
  id: number;
  date: string;
  client: string;
  produit: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

const initialData: VenteRow[] = [
  { id: 1, date: "2024-01-15", client: "Client A", produit: "Produit X", quantite: 5, prixUnitaire: 100, total: 500 },
  { id: 2, date: "2024-01-16", client: "Client B", produit: "Produit Y", quantite: 3, prixUnitaire: 150, total: 450 },
  { id: 3, date: "2024-01-17", client: "Client C", produit: "Produit Z", quantite: 10, prixUnitaire: 50, total: 500 },
];

export default function Ventes() {
  const [rows, setRows] = useState<VenteRow[]>(initialData);
  const [nextId, setNextId] = useState(4);

  const updateCell = (id: number, field: keyof VenteRow, value: string | number) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        if (field === "quantite" || field === "prixUnitaire") {
          updated.total = Number(updated.quantite) * Number(updated.prixUnitaire);
        }
        return updated;
      }
      return row;
    }));
  };

  const addRow = () => {
    const newRow: VenteRow = {
      id: nextId,
      date: new Date().toISOString().split('T')[0],
      client: "",
      produit: "",
      quantite: 0,
      prixUnitaire: 0,
      total: 0,
    };
    setRows([...rows, newRow]);
    setNextId(nextId + 1);
  };

  const deleteRow = (id: number) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const totalGeneral = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <DashboardLayout>
      <PageHeader
        title="Ventes"
        description="Enregistrez vos ventes comme dans un tableur"
        icon={ShoppingCart}
        action={
          <div className="flex gap-2">
            <Button onClick={addRow} className="gap-2">
              <Plus size={16} />
              Nouvelle ligne
            </Button>
            <Button variant="secondary" className="gap-2">
              <Save size={16} />
              Enregistrer
            </Button>
          </div>
        }
      />

      <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-r border-border px-3 py-2 text-left font-semibold text-sm text-card-foreground w-10">#</th>
                <th className="border-r border-border px-3 py-2 text-left font-semibold text-sm text-card-foreground min-w-[120px]">Date</th>
                <th className="border-r border-border px-3 py-2 text-left font-semibold text-sm text-card-foreground min-w-[150px]">Client</th>
                <th className="border-r border-border px-3 py-2 text-left font-semibold text-sm text-card-foreground min-w-[150px]">Produit</th>
                <th className="border-r border-border px-3 py-2 text-left font-semibold text-sm text-card-foreground min-w-[100px]">Quantité</th>
                <th className="border-r border-border px-3 py-2 text-left font-semibold text-sm text-card-foreground min-w-[120px]">Prix Unitaire</th>
                <th className="border-r border-border px-3 py-2 text-left font-semibold text-sm text-card-foreground min-w-[120px]">Total</th>
                <th className="px-3 py-2 text-center font-semibold text-sm text-card-foreground w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="border-r border-border px-3 py-1 text-sm text-muted-foreground bg-muted/30">
                    {index + 1}
                  </td>
                  <td className="border-r border-border p-0">
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateCell(row.id, "date", e.target.value)}
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10"
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <Input
                      type="text"
                      value={row.client}
                      onChange={(e) => updateCell(row.id, "client", e.target.value)}
                      placeholder="Nom du client"
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10"
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <Input
                      type="text"
                      value={row.produit}
                      onChange={(e) => updateCell(row.id, "produit", e.target.value)}
                      placeholder="Nom du produit"
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10"
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <Input
                      type="number"
                      value={row.quantite || ""}
                      onChange={(e) => updateCell(row.id, "quantite", Number(e.target.value))}
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right"
                    />
                  </td>
                  <td className="border-r border-border p-0">
                    <Input
                      type="number"
                      value={row.prixUnitaire || ""}
                      onChange={(e) => updateCell(row.id, "prixUnitaire", Number(e.target.value))}
                      className="border-0 rounded-none h-9 bg-transparent focus:bg-accent/10 text-right"
                    />
                  </td>
                  <td className="border-r border-border px-3 py-1 text-right font-medium text-sm bg-muted/20">
                    {row.total.toLocaleString()} FCFA
                  </td>
                  <td className="px-3 py-1 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRow(row.id)}
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/50">
                <td colSpan={6} className="px-3 py-3 text-right font-bold text-card-foreground">
                  Total Général:
                </td>
                <td className="px-3 py-3 text-right font-bold text-accent text-lg">
                  {totalGeneral.toLocaleString()} FCFA
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-4">
        💡 Cliquez sur une cellule pour modifier. Le total est calculé automatiquement.
      </p>
    </DashboardLayout>
  );
}
