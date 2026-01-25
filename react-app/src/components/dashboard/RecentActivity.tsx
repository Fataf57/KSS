import { FileText, Package, Users, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    type: "invoice",
    icon: FileText,
    title: "Nouvelle facture créée",
    description: "Facture #F-2024-089 - Client: Martin SARL",
    time: "Il y a 5 min",
    color: "text-accent",
  },
  {
    id: 2,
    type: "stock",
    icon: Package,
    title: "Stock mis à jour",
    description: "Produit XYZ-123 - Quantité: +50 unités",
    time: "Il y a 15 min",
    color: "text-success",
  },
  {
    id: 3,
    type: "client",
    icon: Users,
    title: "Nouveau client ajouté",
    description: "Dupont Industries - Paris",
    time: "Il y a 1h",
    color: "text-primary",
  },
  {
    id: 4,
    type: "supplier",
    icon: Truck,
    title: "Commande fournisseur",
    description: "Livraison prévue le 15/12/2025",
    time: "Il y a 2h",
    color: "text-warning",
  },
];

export function RecentActivity() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">Activité récente</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={cn("p-2 rounded-lg bg-muted", activity.color)}>
              <activity.icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-card-foreground">{activity.title}</p>
              <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
