import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Download, Eye } from "lucide-react";

const factures = [
  { id: 1, number: "F-2024-089", client: "Martin SARL", date: "03/12/2025", dueDate: "03/01/2026", amount: 2450.00, status: "Payée" },
  { id: 2, number: "F-2024-088", client: "Dupont Industries", date: "01/12/2025", dueDate: "31/12/2025", amount: 5780.50, status: "En attente" },
  { id: 3, number: "F-2024-087", client: "Bernard Trading", date: "28/11/2025", dueDate: "28/12/2025", amount: 890.00, status: "En attente" },
  { id: 4, number: "F-2024-086", client: "Lefebvre & Fils", date: "25/11/2025", dueDate: "25/12/2025", amount: 3200.00, status: "En retard" },
  { id: 5, number: "F-2024-085", client: "Robert Express", date: "20/11/2025", dueDate: "20/12/2025", amount: 1560.75, status: "Payée" },
  { id: 6, number: "F-2024-084", client: "Petit Commerce", date: "15/11/2025", dueDate: "15/12/2025", amount: 420.00, status: "Payée" },
];

const columns = [
  { key: "number", header: "N° Facture" },
  { key: "client", header: "Client" },
  { key: "date", header: "Date" },
  { key: "dueDate", header: "Échéance" },
  {
    key: "amount",
    header: "Montant",
    render: (item: typeof factures[0]) => (
      <span className="font-medium">€{item.amount.toFixed(2)}</span>
    ),
  },
  {
    key: "status",
    header: "Statut",
    render: (item: typeof factures[0]) => (
      <StatusBadge
        status={
          item.status === "Payée" ? "success" : item.status === "En attente" ? "warning" : "error"
        }
      >
        {item.status}
      </StatusBadge>
    ),
  },
  {
    key: "actions",
    header: "Actions",
    render: () => (
      <div className="flex items-center gap-2">
        <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <Eye size={16} />
        </button>
        <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <Download size={16} />
        </button>
      </div>
    ),
  },
];

const Factures = () => {
  return (
    <DashboardLayout>
      <PageHeader
        title="Factures"
        description="Gérez vos factures et paiements"
        icon={FileText}
        action={
          <Button className="gap-2">
            <Plus size={16} />
            Nouvelle facture
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Ce mois</p>
          <p className="text-2xl font-bold text-card-foreground">€45,280</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Payées</p>
          <p className="text-2xl font-bold text-success">€32,150</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">En attente</p>
          <p className="text-2xl font-bold text-warning">€9,870</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">En retard</p>
          <p className="text-2xl font-bold text-destructive">€3,260</p>
        </div>
      </div>

      <DataTable data={factures} columns={columns} />
    </DashboardLayout>
  );
};

export default Factures;
