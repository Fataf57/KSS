import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Package, ArrowLeft, Loader2, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StockDetail {
  type_denree: string;
  sacs_80kg: number;
  sacs_100kg: number;
  total_sacs: number;
  total_tonnage: number;
  nombre_entrees: number;
}

interface Transaction {
  id: number;
  date: string;
  type_operation: string;
  type_operation_display: string;
  nom_fournisseur: string;
  type_denree: string;
  nombre_sacs: number;
  poids_par_sac: number;
  tonnage_total: number;
  numero_magasin: string;
  numero_magasin_display: string;
  notes: string;
  created_at: string;
}

interface TransactionsResponse {
  magasin_code: string;
  magasin_nom: string;
  transactions: Transaction[];
}

export default function DetailStock() {
  const [details, setDetails] = useState<StockDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMagasin, setSelectedMagasin] = useState<string>("2");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [magasinNom, setMagasinNom] = useState<string>("");
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchDetails = async (magasin?: string) => {
    setIsLoading(true);
    try {
      const url = magasin
        ? getApiUrl(`stock-entries/details/?magasin=${magasin}`)
        : getApiUrl("stock-entries/details/");
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des données");
      }
      
      const data = await response.json();
      setDetails(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les détails du stock",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails(selectedMagasin);
  }, [selectedMagasin]);

  // Recharger les données quand un événement de mise à jour du stock est déclenché
  useEffect(() => {
    const handleStockUpdate = () => {
      console.log('Événement stock-updated reçu, rafraîchissement des données...');
      fetchDetails(selectedMagasin);
    };

    window.addEventListener('stock-updated', handleStockUpdate);
    return () => window.removeEventListener('stock-updated', handleStockUpdate);
  }, [selectedMagasin]);

  // Recharger aussi quand la page devient visible (quand on revient dessus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page visible, rafraîchissement des données...');
        fetchDetails(selectedMagasin);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedMagasin]);

  const handleMagasinChange = (value: string) => {
    setSelectedMagasin(value);
  };

  const getMagasinName = (code: string): string => {
    const magasins: { [key: string]: string } = {
      "1": "Djaradougou",
      "2": "Ouezzin-ville",
      "3": "Bamako",
    };
    return magasins[code] || "";
  };

  const fetchTransactions = async (magasin: string) => {
    setIsLoadingTransactions(true);
    try {
      const response = await fetch(
        getApiUrl(`stock-entries/transactions_magasin/?magasin=${magasin}`)
      );
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des transactions");
      }
      
      const data: TransactionsResponse = await response.json();
      setTransactions(data.transactions);
      setMagasinNom(data.magasin_nom);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les transactions",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleOpenHistory = () => {
    if (selectedMagasin) {
      setIsHistoryOpen(true);
      fetchTransactions(selectedMagasin);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const formatNumber = (value: number) => {
    // Supprimer les décimales inutiles (.00)
    // Vérifier si c'est un entier ou si les décimales sont nulles
    if (value % 1 === 0 || Math.abs(value % 1) < 0.001) {
      return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    }
    // Formater avec 2 décimales max, mais supprimer les .00 à la fin
    const formatted = value.toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
    // Supprimer les .00 à la fin si présents (pour les cas comme 50.00)
    return formatted.replace(/\.00$/, '');
  };

  return (
    <DashboardLayout>
      <PageHeader
        title={
          <div className="flex items-center gap-5">
            <span>Détails du Stock</span>
            <div className="flex gap-3 border border-border rounded-full px-4 py-2 bg-muted/40 shadow-sm ml-10">
              <Button
                variant={selectedMagasin === "2" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleMagasinChange("2")}
                className="h-10 px-5 text-base font-semibold"
              >
                Ouezzin-ville
              </Button>
              <Button
                variant={selectedMagasin === "1" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleMagasinChange("1")}
                className="h-10 px-5 text-base font-semibold"
              >
                Djaradougou
              </Button>
              <Button
                variant={selectedMagasin === "3" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleMagasinChange("3")}
                className="h-10 px-5 text-base font-semibold"
              >
                Mali
              </Button>
            </div>
          </div>
        }
        icon={Package}
        action={
          selectedMagasin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleOpenHistory}
                className="gap-2"
              >
                <History size={16} />
                Historique
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  // Déclencher un rafraîchissement avant de revenir
                  window.dispatchEvent(new Event('stock-updated'));
                  navigate(-1);
                }}
                className="gap-2"
              >
                <ArrowLeft size={16} />
                Retour
              </Button>
            </div>
          )
        }
      />

      {/* Tableau des détails */}
      <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Chargement des données...</span>
          </div>
        ) : details.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg font-medium text-card-foreground">
              Magasin vide
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted sticky top-0 z-10">
                  <th className="border-r border-gray-400 dark:border-gray-600 px-2 py-3 text-left font-semibold text-xl text-card-foreground min-w-[200px] bg-muted">
                    Nom Produit
                  </th>
                  <th className="border-r border-gray-400 dark:border-gray-600 px-2 py-3 text-right font-semibold text-xl text-card-foreground min-w-[140px] bg-muted">
                    Total tonnage
                  </th>
                  <th className="border-r border-gray-400 dark:border-gray-600 px-2 py-3 text-right font-semibold text-xl text-card-foreground min-w-[110px] bg-muted">
                    Total sacs
                  </th>
                  <th className="border-r border-gray-400 dark:border-gray-600 px-2 py-3 text-right font-semibold text-xl text-card-foreground min-w-[90px] bg-muted">
                    Sacs 80kg
                  </th>
                  <th className="px-2 py-3 text-right font-semibold text-xl text-card-foreground min-w-[90px] bg-muted">
                    Sacs 100kg
                  </th>
                </tr>
              </thead>
              <tbody>
                {details.map((detail) => (
                  <tr 
                    key={detail.type_denree} 
                    className="border-t border-gray-400 dark:border-gray-600 hover:bg-muted/20 transition-colors"
                  >
                    <td className="border-r border-gray-400 dark:border-gray-600 px-2 py-2">
                      <span className="font-medium text-xl text-card-foreground">
                        {detail.type_denree}
                      </span>
                    </td>
                    <td className="border-r border-gray-400 dark:border-gray-600 px-2 py-2 text-right bg-muted/20">
                      <span className="font-extrabold text-2xl text-card-foreground">
                        {detail.total_tonnage.toLocaleString()}{" "}
                        <span className="text-lg font-semibold">kg</span>
                      </span>
                    </td>
                    <td className="border-r border-gray-400 dark:border-gray-600 px-2 py-2 text-right bg-muted/10">
                      <span className="font-extrabold text-2xl text-card-foreground">
                        {detail.total_sacs.toLocaleString()}
                      </span>
                    </td>
                    <td className="border-r border-gray-400 dark:border-gray-600 px-2 py-2 text-right">
                      <span className="font-medium text-xl text-card-foreground">
                        {detail.sacs_80kg > 0 ? detail.sacs_80kg.toLocaleString() : "-"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="font-medium text-xl text-card-foreground">
                        {detail.sacs_100kg > 0 ? detail.sacs_100kg.toLocaleString() : "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Historique des transactions */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Historique - {magasinNom}</DialogTitle>
            <DialogDescription>
              Liste complète des entrées et sorties pour ce magasin
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingTransactions ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-lg text-muted-foreground">Chargement des transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-medium text-card-foreground mb-2">
                Aucune transaction
              </p>
              <p className="text-base text-muted-foreground">
                Aucune transaction enregistrée pour ce magasin
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted sticky top-0 z-10">
                    <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left font-semibold text-lg">
                      Date
                    </th>
                    <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left font-semibold text-lg">
                      Type
                    </th>
                    <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left font-semibold text-lg">
                      Type de denrée
                    </th>
                    <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left font-semibold text-lg">
                      Client
                    </th>
                    <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-right font-semibold text-lg">
                      Sacs
                    </th>
                    <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-right font-semibold text-lg">
                      Poids/sac
                    </th>
                    <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-right font-semibold text-lg">
                      Tonnage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr 
                      key={transaction.id}
                      className={`border-t border-gray-400 dark:border-gray-600 hover:bg-muted/30 ${
                        transaction.type_operation === 'entree' 
                          ? 'bg-green-50/50 dark:bg-green-950/20' 
                          : 'bg-red-50/50 dark:bg-red-950/20'
                      }`}
                    >
                      <td className="border-r border-gray-400 dark:border-gray-600 px-4 py-3 text-base">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-4 py-3">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                          transaction.type_operation === 'entree'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {transaction.type_operation_display}
                        </span>
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-4 py-3 text-base">
                        {transaction.type_denree}
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-4 py-3 text-base">
                        {transaction.nom_fournisseur || "-"}
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-4 py-3 text-right text-base">
                        {transaction.nombre_sacs.toLocaleString()}
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-4 py-3 text-right text-base">
                        {formatNumber(transaction.poids_par_sac)} kg
                      </td>
                      <td className="border-r border-gray-400 dark:border-gray-600 px-4 py-3 text-right font-semibold text-base">
                        {formatNumber(transaction.tonnage_total)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Bouton flottant pour aller au tableau d'ajout (entrées/sorties de stock) */}
      <Button
        onClick={() => {
          // Si on est sur le magasin Mali (code "3"), passer le paramètre magasin
          if (selectedMagasin === "3") {
            navigate("/entrees-stock?magasin=3");
          } else {
            navigate("/entrees-stock");
          }
        }}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg gap-2 z-50"
        size="icon"
      >
        <Plus size={24} />
      </Button>
    </DashboardLayout>
  );
}

