import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users, Plus, Loader2, Trash2, ArrowLeft, Lock, Unlock, Settings, EyeOff, Save } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

interface Employee {
  id: number;
  first_name?: string;
  last_name?: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  is_private?: boolean;
  allowed_users?: number[];
  is_active?: boolean;
}

interface UserOption {
  id: number;
  username: string;
  email?: string;
}

export default function ListeEmployes() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isVisibilityDialogOpen, setIsVisibilityDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [visibilitySettings, setVisibilitySettings] = useState({
    is_private: false,
    allowed_users: [] as number[],
    is_active: true,
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token, user, logout } = useAuth();

  // Formulaire pour nouvel employé
  const [newEmployee, setNewEmployee] = useState({
    nom_prenom: "",
    is_private: false,
    allowed_users: [] as number[],
  });

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl("employees/"), {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (response.ok) {
        const data = await response.json();
        // S'assurer que les données sont un tableau
        if (Array.isArray(data)) {
          setEmployees(data);
        } else {
          console.error("Les données reçues ne sont pas un tableau:", data);
          setEmployees([]);
          toast({
            title: "Avertissement",
            description: "Format de données inattendu reçu du serveur",
            variant: "destructive",
          });
        }
      } else {
        let errorMessage = "Erreur lors du chargement des employés";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          
          // Gérer les autres erreurs spécifiques
          if (response.status === 401) {
            errorMessage = "Erreur d'authentification pour les employés. Vérifiez vos droits ou reconnectez-vous.";
          } else if (response.status === 403) {
            errorMessage = "Vous n'avez pas la permission d'accéder à cette ressource.";
          } else if (response.status === 404) {
            errorMessage = "L'endpoint des employés est introuvable.";
          } else if (response.status >= 500) {
            errorMessage = "Erreur serveur. Veuillez réessayer plus tard.";
          }
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      let errorMessage = "Impossible de charger les employés";
      
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
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    setIsLoadingUsers(true);
    try {
      const response = await fetch(getApiUrl("account/users/"), {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Ne pas proposer l'utilisateur courant dans la liste : 
        // il aura déjà accès au tableau en tant que créateur.
        const filtered = user ? data.filter((u: UserOption) => u.id !== user.id) : data;
        setUsers(filtered);
      } else {
        let errorMessage = "Erreur lors du chargement des utilisateurs";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }

        if (response.status === 401) {
          errorMessage = "Erreur d'authentification lors du chargement des utilisateurs. Vérifiez vos droits ou reconnectez-vous.";
        }

        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
      let errorMessage = "Impossible de charger les utilisateurs";
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
      setIsLoadingUsers(false);
    }
  };

  // Charger la liste des employés au montage et quand le token change
  useEffect(() => {
    fetchEmployees();
  }, [token]);

  // Rafraîchissement automatique toutes les 10 secondes
  useAutoRefresh(fetchEmployees, 10000);

  // Charger la liste des utilisateurs dès que le token est disponible
  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const handleAddEmployee = async () => {
    if (!newEmployee.nom_prenom.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom et prénom sont requis",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(getApiUrl("employees/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newEmployee),
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
        // Ajouter un message plus explicite pour les erreurs 401 sans déconnexion automatique
        if (response.status === 401) {
          errorMessage = "Erreur d'authentification lors de la création de l'employé. Vérifiez vos droits ou reconnectez-vous.";
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Succès !",
        description: "Employé ajouté avec succès",
      });

      // Réinitialiser le formulaire
      setNewEmployee({
        nom_prenom: "",
        is_private: false,
        allowed_users: [],
      });

      setIsDialogOpen(false);
      fetchEmployees(); // Recharger la liste
    } catch (error: any) {
      let errorMessage = "Impossible d'ajouter l'employé";
      
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

  const handleDeleteClick = (employee: Employee, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(getApiUrl(`employees/${employeeToDelete.id}/`), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        let errorMessage = "Erreur lors de la suppression";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          
          // Vérifier si c'est une erreur de contrainte de clé étrangère
          if (errorMessage.includes("dépense") || errorMessage.includes("expenses")) {
            errorMessage = "Impossible de supprimer cet employé car il a des dépenses associées. Supprimez d'abord les dépenses.";
          }
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        // Ajouter un message plus explicite pour les erreurs 401 sans déconnexion automatique
        if (response.status === 401) {
          errorMessage = "Erreur d'authentification lors de la suppression de l'employé. Vérifiez vos droits ou reconnectez-vous.";
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Succès !",
        description: "Employé supprimé avec succès",
      });

      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
      fetchEmployees(); // Recharger la liste
    } catch (error: any) {
      let errorMessage = "Impossible de supprimer l'employé";
      
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

  const handleEditVisibilityClick = async (employee: Employee, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmployeeToEdit(employee);
    
    // Charger les détails complets de l'employé pour obtenir allowed_users
    try {
      const response = await fetch(getApiUrl(`employees/${employee.id}/`), {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      if (response.ok) {
        const fullEmployee = await response.json();
        setVisibilitySettings({
          is_private: fullEmployee.is_private || false,
          allowed_users: fullEmployee.allowed_users || [],
          is_active: fullEmployee.is_active !== undefined ? fullEmployee.is_active : true,
        });
      } else {
        // Si l'API ne retourne pas les détails, utiliser les données de base
        setVisibilitySettings({
          is_private: employee.is_private || false,
          allowed_users: employee.allowed_users || [],
          is_active: employee.is_active !== undefined ? employee.is_active : true,
        });
      }
    } catch (error) {
      // En cas d'erreur, utiliser les données de base
      setVisibilitySettings({
        is_private: employee.is_private || false,
        allowed_users: employee.allowed_users || [],
        is_active: employee.is_active !== undefined ? employee.is_active : true,
      });
    }
    
    setIsVisibilityDialogOpen(true);
  };

  const handleUpdateVisibility = async () => {
    if (!employeeToEdit) return;

    setIsUpdatingVisibility(true);
    try {
      const response = await fetch(getApiUrl(`employees/${employeeToEdit.id}/`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nom_prenom: employeeToEdit.full_name,
          is_private: visibilitySettings.is_private,
          allowed_users: visibilitySettings.is_private ? visibilitySettings.allowed_users : [],
          is_active: true, // Toujours activé
        }),
      });

      if (!response.ok) {
        let errorMessage = "Erreur lors de la mise à jour";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Succès !",
        description: "Visibilité du tableau mise à jour avec succès",
      });

      setIsVisibilityDialogOpen(false);
      setEmployeeToEdit(null);
      fetchEmployees(); // Recharger la liste
    } catch (error: any) {
      let errorMessage = "Impossible de mettre à jour la visibilité";
      
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
      setIsUpdatingVisibility(false);
    }
  };


  return (
    <DashboardLayout>
      <PageHeader
        title="Liste des Employés"
        icon={Users}
        action={
          <Button 
            variant="secondary" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Retour
          </Button>
        }
      />

      {/* Liste des employés */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Chargement des employés...</span>
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-muted/50 rounded-xl border border-border p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-card-foreground mb-2">
            Aucun employé
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Ajoutez votre premier employé pour commencer
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus size={16} />
            Ajouter un employé
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="bg-card rounded-xl border border-border p-6 hover:border-accent transition-colors cursor-pointer"
              onClick={() => navigate(`/suivi-employes/${employee.id}`)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-card-foreground">
                    {employee.full_name}
                  </h3>
                  {employee.is_private && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <Lock className="h-4 w-4" />
                      <span className="text-sm font-medium">privé</span>
                    </div>
                  )}
                  {employee.is_active === false && (
                    <div className="flex items-center gap-1 text-red-600">
                      <EyeOff className="h-4 w-4" />
                      <span className="text-sm font-medium">désactivé</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleEditVisibilityClick(employee, e)}
                    className="h-10 w-10 text-primary hover:text-primary hover:bg-primary/10"
                    title="Modifier la visibilité"
                  >
                    <Settings size={20} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteClick(employee, e)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Supprimer l'employé"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
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
              Êtes-vous sûr de vouloir supprimer l'employé <strong>{employeeToDelete?.full_name}</strong> ?
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

      {/* Dialog de modification de visibilité */}
      <Dialog open={isVisibilityDialogOpen} onOpenChange={setIsVisibilityDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Modifier la visibilité du tableau</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm text-muted-foreground mb-2">
              Employé : <strong className="text-card-foreground">{employeeToEdit?.full_name}</strong>
            </div>
            
            {/* Option : Rendre privé */}
            <div className="flex items-center justify-between gap-4 p-3 border rounded-md">
              <div className="flex items-center gap-2">
                <input
                  id="is_private_edit"
                  type="checkbox"
                  checked={visibilitySettings.is_private}
                  onChange={(e) =>
                    setVisibilitySettings({
                      ...visibilitySettings,
                      is_private: e.target.checked,
                      // Si on décoche privé, on vide la liste des utilisateurs autorisés
                      allowed_users: e.target.checked ? visibilitySettings.allowed_users : [],
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="is_private_edit" className="flex items-center gap-1">
                  {visibilitySettings.is_private ? (
                    <Lock className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Unlock className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>Tableau privé</span>
                </Label>
              </div>
              {visibilitySettings.is_private && (
                <span className="text-xs text-muted-foreground">
                  Visible uniquement par vous et les utilisateurs autorisés
                </span>
              )}
            </div>

            {/* Sélection des utilisateurs autorisés */}
            {visibilitySettings.is_private && (
              <div className="grid gap-2">
                <Label htmlFor="allowed_users_edit">Utilisateurs autorisés à voir ce tableau</Label>
                <div className="border rounded-md p-2 max-h-40 overflow-auto space-y-1">
                  {isLoadingUsers && (
                    <div className="text-sm text-muted-foreground">Chargement des utilisateurs...</div>
                  )}
                  {!isLoadingUsers && users.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Aucun utilisateur disponible.
                    </div>
                  )}
                  {!isLoadingUsers &&
                    users.map((userOption) => (
                      <label
                        key={userOption.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted px-1 py-0.5 rounded"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={visibilitySettings.allowed_users.includes(userOption.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setVisibilitySettings((prev) => ({
                              ...prev,
                              allowed_users: checked
                                ? [...prev.allowed_users, userOption.id]
                                : prev.allowed_users.filter((id) => id !== userOption.id),
                            }));
                          }}
                        />
                        <span className="font-medium">{userOption.username}</span>
                        {userOption.email && (
                          <span className="text-xs text-muted-foreground">({userOption.email})</span>
                        )}
                      </label>
                    ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleUpdateVisibility}
                disabled={isUpdatingVisibility}
                className="gap-2 flex-1"
              >
                {isUpdatingVisibility ? (
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
              <Button
                variant="secondary"
                onClick={() => setIsVisibilityDialogOpen(false)}
                disabled={isUpdatingVisibility}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bouton flottant pour ajouter un employé */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg gap-2 z-50"
            size="icon"
          >
            <Plus size={24} />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Nouvel Employé</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nom_prenom">Nom et Prénom *</Label>
              <Input
                id="nom_prenom"
                value={newEmployee.nom_prenom}
                onChange={(e) => setNewEmployee({ ...newEmployee, nom_prenom: e.target.value })}
                placeholder="Ex: Jean Dupont"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newEmployee.nom_prenom.trim()) {
                    handleAddEmployee();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <input
                  id="is_private"
                  type="checkbox"
                  checked={newEmployee.is_private}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      is_private: e.target.checked,
                      // Si on décoche privé, on vide la liste des utilisateurs autorisés
                      allowed_users: e.target.checked ? newEmployee.allowed_users : [],
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="is_private" className="flex items-center gap-1">
                  {newEmployee.is_private ? (
                    <Lock className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Unlock className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>Tableau privé</span>
                </Label>
              </div>
            </div>
            {newEmployee.is_private && (
              <div className="grid gap-2">
                <Label htmlFor="allowed_users">Utilisateurs autorisés à voir ce tableau</Label>
                <div className="border rounded-md p-2 max-h-40 overflow-auto space-y-1">
                  {isLoadingUsers && (
                    <div className="text-sm text-muted-foreground">Chargement des utilisateurs...</div>
                  )}
                  {!isLoadingUsers && users.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Aucun utilisateur disponible.
                    </div>
                  )}
                  {!isLoadingUsers &&
                    users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted px-1 py-0.5 rounded"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={newEmployee.allowed_users.includes(user.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNewEmployee((prev) => ({
                              ...prev,
                              allowed_users: checked
                                ? [...prev.allowed_users, user.id]
                                : prev.allowed_users.filter((id) => id !== user.id),
                            }));
                          }}
                        />
                        <span className="font-medium">{user.username}</span>
                        {user.email && (
                          <span className="text-xs text-muted-foreground">({user.email})</span>
                        )}
                      </label>
                    ))}
                </div>
              </div>
            )}
            <Button onClick={handleAddEmployee} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Ajouter l'employé
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}


