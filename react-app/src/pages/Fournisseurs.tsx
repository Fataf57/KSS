import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Truck, Plus, MapPin } from "lucide-react";

const fournisseurs = [
  { id: 1, name: "Tech Supplies Co.", category: "Électronique", country: "France", deliveryTime: "3-5 jours", status: "Actif", lastOrder: "28/11/2025" },
  { id: 2, name: "Global Materials", category: "Matières premières", country: "Allemagne", deliveryTime: "5-7 jours", status: "Actif", lastOrder: "25/11/2025" },
  { id: 3, name: "Fast Packaging", category: "Emballage", country: "France", deliveryTime: "2-3 jours", status: "Actif", lastOrder: "01/12/2025" },
  { id: 4, name: "Quality Parts Ltd", category: "Composants", country: "Italie", deliveryTime: "7-10 jours", status: "En pause", lastOrder: "15/10/2025" },
  { id: 5, name: "Office Essentials", category: "Fournitures", country: "France", deliveryTime: "1-2 jours", status: "Actif", lastOrder: "02/12/2025" },
];

const columns = [
  { key: "name", header: "Fournisseur" },
  { key: "category", header: "Catégorie" },
  {
    key: "country",
    header: "Pays",
    render: (item: typeof fournisseurs[0]) => (
      <div className="flex items-center gap-2">
        <MapPin size={14} className="text-muted-foreground" />
        {item.country}
      </div>
    ),
  },
  { key: "deliveryTime", header: "Délai livraison" },
  {
    key: "status",
    header: "Statut",
    render: (item: typeof fournisseurs[0]) => (
      <StatusBadge status={item.status === "Actif" ? "success" : "warning"}>
        {item.status}
      </StatusBadge>
    ),
  },
  { key: "lastOrder", header: "Dernière commande" },
];

const Fournisseurs = () => {
  return (
    <DashboardLayout>
      <PageHeader
        title="Fournisseurs"
        description="Gérez vos fournisseurs et commandes"
        icon={Truck}
        action={
          <Button className="gap-2">
            <Plus size={16} />
            Nouveau fournisseur
          </Button>
        }
      />

      <DataTable data={fournisseurs} columns={columns} />
    </DashboardLayout>
  );
};

export default Fournisseurs;
