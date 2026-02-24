import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.jsx";

// ─── React Query Client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // Data stays fresh for 5 minutes
      gcTime: 1000 * 60 * 10,          // Cache held for 10 minutes
      retry: 1,                         // Only retry failed requests once
      refetchOnWindowFocus: false,      // Don't refetch when window regains focus
      refetchOnReconnect: "always",     // Refetch when reconnecting to internet
    },
    mutations: {
      retry: 0,                         // Don't retry mutations by default
    },
  },
});

// ─── Root Render ──────────────────────────────────────────────────────────────
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* React Query DevTools - only shown in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>
);