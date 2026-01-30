import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config/api";

interface Client {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

export default function ListeClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Formulaire pour nouveau client
  const [newClient, setNewClient] = useState({
    nom_prenom: "",
  });

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl("customers/"));
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      } else {
        throw new Error("Erreur lors du chargement des clients");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les clients",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClient = async () => {
    if (!newClient.nom_prenom.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom et prénom sont requis",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(getApiUrl("customers/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newClient),
      });

      if (!response.ok) {
        let errorMessage = "Erreur lors de la création";
        try {
          const errorData = await response.json();
          // Gérer les erreurs DRF
          if (errorData.nom_prenom) {
            errorMessage = Array.isArray(errorData.nom_prenom) 
              ? errorData.nom_prenom[0] 
              : errorData.nom_prenom;
          } else if (errorData.non_field_errors) {
            errorMessage = Array.isArray(errorData.non_field_errors)
              ? errorData.non_field_errors[0]
              : errorData.non_field_errors;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else {
            // Afficher toutes les erreurs de validation
            const errorMessages = Object.entries(errorData)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value[0] : value}`)
              .join(', ');
            if (errorMessages) {
              errorMessage = errorMessages;
            }
          }
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Succès !",
        description: "Client ajouté avec succès",
      });

      // Réinitialiser le formulaire
      setNewClient({
        nom_prenom: "",
      });

      setIsDialogOpen(false);
      fetchClients(); // Recharger la liste
    } catch (error: any) {
      let errorMessage = "Impossible d'ajouter le client";
      
      if (error.message && error.message.includes("Failed to fetch")) {
        errorMessage = "Impossible de se connecter au serveur. Vérifiez que le serveur Django est lancé.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(getApiUrl(`customers/${clientToDelete.id}/`), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Erreur lors de la suppression";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          
          // Vérifier si c'est une erreur de contrainte de clé étrangère
          if (errorMessage.includes("chargement") || errorMessage.includes("chargements")) {
            errorMessage = "Impossible de supprimer ce client car il a des chargements associés. Supprimez d'abord les chargements.";
          }
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Succès !",
        description: "Client supprimé avec succès",
      });

      setDeleteDialogOpen(false);
      setClientToDelete(null);
      fetchClients(); // Recharger la liste
    } catch (error: any) {
      let errorMessage = "Impossible de supprimer le client";
      
      if (error.message && error.message.includes("Failed to fetch")) {
        errorMessage = "Impossible de se connecter au serveur. Vérifiez que le serveur Django est lancé.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <DashboardLayout>
      <PageHeader
        title="Liste des Clients"
        icon={Users}
      />

      {/* Liste des clients */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Chargement des clients...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-muted/50 rounded-xl border border-border p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-card-foreground mb-2">
            Aucun client
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Ajoutez votre premier client pour commencer
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus size={16} />
            Ajouter un client
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-card rounded-xl border border-border p-6 hover:border-accent transition-colors cursor-pointer"
              onClick={() => navigate(`/suivi-clients/${client.id}`)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-card-foreground">
                  {client.full_name}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteClick(client, e)}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Supprimer le client"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le client <strong>{clientToDelete?.full_name}</strong> ?
              {clientToDelete && (
                <span className="block mt-2 text-destructive">
                  Cette action supprimera également tous les chargements associés à ce client. Cette action est irréversible.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
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

      {/* Bouton flottant pour ajouter un client */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg gap-2 z-50"
            size="icon"
          >
            <Plus size={24} />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouveau Client</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nom_prenom">Nom et Prénom *</Label>
              <Input
                id="nom_prenom"
                value={newClient.nom_prenom}
                onChange={(e) => setNewClient({ ...newClient, nom_prenom: e.target.value })}
                placeholder="Ex: Jean Dupont"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newClient.nom_prenom.trim()) {
                    handleAddClient();
                  }
                }}
              />
            </div>
            <Button onClick={handleAddClient} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Ajouter le client
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

