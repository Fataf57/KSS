import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import EntreesStock from "./pages/EntreesStock";
import DetailStock from "./pages/DetailStock";
import ChargementCamion from "./pages/ChargementCamion";
import SuiviClients from "./pages/SuiviClients";
import ListeClients from "./pages/ListeClients";
import SuiviAchats from "./pages/SuiviAchats";
import ListeAchats from "./pages/ListeAchats";
import SuiviEmployes from "./pages/SuiviEmployes";
import ListeEmployes from "./pages/ListeEmployes";
import Avances from "./pages/Avances";
import Achats from "./pages/Achats";
import Depenses from "./pages/Depenses";
import NotFound from "./pages/NotFound";
import Reload from "./pages/Reload";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/entrees-stock"
              element={
                <ProtectedRoute>
                  <EntreesStock />
                </ProtectedRoute>
              }
            />
            <Route
              path="/detail-stock"
              element={
                <ProtectedRoute>
                  <DetailStock />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chargement-camion"
              element={
                <ProtectedRoute>
                  <ChargementCamion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/liste-clients"
              element={
                <ProtectedRoute>
                  <ListeClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suivi-clients/:clientId"
              element={
                <ProtectedRoute>
                  <SuiviClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suivi-clients"
              element={
                <ProtectedRoute>
                  <SuiviClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/liste-achats"
              element={
                <ProtectedRoute>
                  <ListeAchats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suivi-achats/:clientId"
              element={
                <ProtectedRoute>
                  <SuiviAchats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suivi-achats"
              element={
                <ProtectedRoute>
                  <SuiviAchats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/liste-employes"
              element={
                <ProtectedRoute>
                  <ListeEmployes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suivi-employes/:employeeId"
              element={
                <ProtectedRoute>
                  <SuiviEmployes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suivi-employes"
              element={
                <ProtectedRoute>
                  <SuiviEmployes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/avances"
              element={
                <ProtectedRoute>
                  <Avances />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achats"
              element={
                <ProtectedRoute>
                  <Achats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/depenses"
              element={
                <ProtectedRoute>
                  <Depenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reload"
              element={
                <ProtectedRoute>
                  <Reload />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
