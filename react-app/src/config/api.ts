// Configuration centralisée de l'API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

// Fonction utilitaire pour construire les URLs de l'API
export const getApiUrl = (endpoint: string): string => {
  // Enlever le slash initial s'il existe pour éviter les doubles slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

