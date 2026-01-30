import { LayoutDashboard, Warehouse, UserCheck, Loader, Briefcase, ShoppingCart, Receipt, LogOut, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Acceuil", url: "/", icon: LayoutDashboard },
  // Magasin : on pointe d'abord sur les détails du stock
  { title: "Magasin", url: "/detail-stock", icon: Warehouse },
  { title: "Camion", url: "/chargement-camion", icon: Loader },
  { title: "Tableau client", url: "/liste-clients", icon: UserCheck },
  { title: "Tableau employe", url: "/liste-employes", icon: Briefcase },
  { title: "Achats", url: "/achats", icon: ShoppingCart },
  { title: "Dépenses", url: "/depenses", icon: Receipt },
  { title: "Reload", url: "/reload", icon: RefreshCw },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>

      {/* Sidebar - Barre horizontale en haut */}
      <aside
        className={cn(
          "w-full bg-sidebar text-sidebar-foreground z-40 transition-all duration-300 flex flex-row items-center border-b border-sidebar-border",
          "h-16"
        )}
      >
        {/* Logo */}
        <div className="h-full flex items-center px-4 lg:px-6 border-r border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Logo de l'ETABLISSEMENT KADER SAWADOGO */}
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden border border-sidebar-border">
              <img
                src="/ksslogo.jpeg"
                alt="Logo ETABLISSEMENT KADER SAWADOGO"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-semibold text-lg tracking-tight hidden sm:inline">
              KSS
            </span>
          </div>
        </div>

        {/* Navigation - Horizontal */}
        <nav className="flex-1 py-2 px-3 overflow-x-auto">
          <ul className="flex items-center gap-1 h-full">
            {navItems.map((item) => (
              <li key={item.title} className="flex-shrink-0">
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-muted transition-all duration-200 whitespace-nowrap",
                    "hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                >
                  <item.icon size={22} />
                  <span className="text-lg font-semibold hidden md:inline">
                    {item.title}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer - En ligne à droite */}
        <div className="p-2 border-l border-sidebar-border flex-shrink-0 flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-medium">
              {user?.username?.charAt(0).toUpperCase() || "K"}
            </div>
            <div className="flex flex-col min-w-0 hidden lg:flex">
              <p className="text-xs font-medium truncate">{user?.username || "KSS"}</p>
              <p className="text-xs text-sidebar-muted truncate">Profil</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
            title="Déconnexion"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </aside>
    </>
  );
}
