import { useEffect, useRef } from "react";

/**
 * Rafraîchit automatiquement une fonction (ex: fetch de la liste)
 * à intervalle régulier, en mettant en pause quand l'onglet est inactif.
 *
 * @param callback   fonction à appeler (ex: fetchClients)
 * @param intervalMs intervalle en ms (défaut 10000 = 10s)
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  intervalMs: number = 10000
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<number | null>(null);

  // garder la dernière version de la fonction
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const run = () => {
      // ne rafraîchir que si la page est visible
      if (!document.hidden) {
        callbackRef.current();
      }
    };

    // lancer une première fois
    run();

    // démarrer l'intervalle
    timerRef.current = window.setInterval(run, intervalMs);

    // mettre en pause / reprendre selon visibilité
    const handleVisibility = () => {
      if (document.hidden && timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      } else if (!document.hidden && timerRef.current === null) {
        run();
        timerRef.current = window.setInterval(run, intervalMs);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs]);
}


