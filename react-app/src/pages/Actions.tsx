import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Zap, Plus, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

const actions = [
  {
    id: 1,
    title: "Relancer les factures en retard",
    description: "3 factures nécessitent une relance",
    priority: "Haute",
    dueDate: "Aujourd'hui",
    status: "pending",
  },
  {
    id: 2,
    title: "Commander stock câbles HDMI",
    description: "Stock en rupture - commande urgente",
    priority: "Haute",
    dueDate: "Aujourd'hui",
    status: "pending",
  },
  {
    id: 3,
    title: "Valider nouveau fournisseur",
    description: "Quality Parts Ltd - en attente d'approbation",
    priority: "Moyenne",
    dueDate: "05/12/2025",
    status: "pending",
  },
  {
    id: 4,
    title: "Mise à jour tarifs 2026",
    description: "Préparer la nouvelle grille tarifaire",
    priority: "Basse",
    dueDate: "15/12/2025",
    status: "pending",
  },
  {
    id: 5,
    title: "Inventaire fin d'année",
    description: "Planifier l'inventaire annuel",
    priority: "Moyenne",
    dueDate: "20/12/2025",
    status: "pending",
  },
];

const completedActions = [
  { id: 101, title: "Envoyer devis Martin SARL", completedDate: "02/12/2025" },
  { id: 102, title: "Mettre à jour coordonnées Dupont", completedDate: "01/12/2025" },
  { id: 103, title: "Archiver factures Nov 2024", completedDate: "30/11/2025" },
];

const Actions = () => {
  return (
    <DashboardLayout>
      <PageHeader
        title="Actions"
        description="Gérez vos tâches et rappels"
        icon={Zap}
        action={
          <Button className="gap-2">
            <Plus size={16} />
            Nouvelle action
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock size={20} className="text-warning" />
            Actions en cours
          </h3>
          <div className="space-y-3">
            {actions.map((action, index) => (
              <div
                key={action.id}
                className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-card-foreground">{action.title}</h4>
                      <StatusBadge
                        status={
                          action.priority === "Haute"
                            ? "error"
                            : action.priority === "Moyenne"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {action.priority}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{action.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={12} />
                      Échéance: {action.dueDate}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-accent hover:text-accent">
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 size={20} className="text-success" />
            Terminées récemment
          </h3>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="space-y-3">
              {completedActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-card-foreground truncate">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.completedDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h4 className="font-medium text-card-foreground mb-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-accent" />
              Résumé
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">En cours</span>
                <span className="font-medium text-card-foreground">{actions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Urgentes</span>
                <span className="font-medium text-destructive">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cette semaine</span>
                <span className="font-medium text-warning">3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Actions;
