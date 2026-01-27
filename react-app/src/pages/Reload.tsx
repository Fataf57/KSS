import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";

const TEN_MINUTES = 10 * 60 * 1000;

const Reload = () => {
  const [autoReloadActive, setAutoReloadActive] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const startAutoReload = () => {
    if (intervalRef.current !== null) return;

    const id = window.setInterval(() => {
      window.location.reload();
    }, TEN_MINUTES);

    intervalRef.current = id;
    setAutoReloadActive(true);
  };

  const stopAutoReload = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setAutoReloadActive(false);
  };

  useEffect(() => {
    // Nettoyage si on quitte la page
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto mt-10 space-y-6">
        <h1 className="text-2xl font-bold text-card-foreground">
          Onglet Reload
        </h1>
        <p className="text-sm text-muted-foreground">
          Cliquez sur le bouton ci-dessous pour activer le rechargement automatique
          de cette page toutes les 10 minutes. Vous pouvez aussi l&rsquo;arrêter.
        </p>

        <div className="flex items-center gap-4">
          <Button
            onClick={autoReloadActive ? stopAutoReload : startAutoReload}
            variant={autoReloadActive ? "destructive" : "default"}
          >
            {autoReloadActive ? "Désactiver le reload automatique" : "Activer le reload automatique"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {autoReloadActive
              ? "Le reload automatique est ACTIVÉ (toutes les 10 minutes)."
              : "Le reload automatique est désactivé."}
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reload;


