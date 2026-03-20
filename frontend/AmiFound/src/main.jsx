import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";

// ─── Smart retry: never retry 4xx (auth/not-found/validation errors) ─────────
// Retrying a 401 or 404 is pointless and wastes a round-trip.
// Only retry genuine server errors (5xx) or network failures, once.
const shouldRetry = (failureCount, error) => {
  const status = error?.status ?? error?.response?.status;
  if (status >= 400 && status < 500) return false;
  return failureCount < 1;
};

// ─── React Query Client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           1000 * 60 * 5,  // Data stays fresh for 5 minutes
      gcTime:              1000 * 60 * 10, // Cache held for 10 minutes (after all observers unmount)
      retry:               shouldRetry,    // FIX #1: skip retries on 4xx errors
      refetchOnWindowFocus: false,         // Don't silently refetch on tab switch
      refetchOnReconnect:  true,           // FIX #2: 'always' refetches even fresh data; 'true' only refetches stale
    },
    mutations: {
      retry: 0, // Never retry mutations — side effects must not be duplicated
    },
  },
});

// ─── DevTools (dev only, zero prod bundle impact) ────────────────────────────
// FIX #3: dynamic import so the devtools module is NEVER downloaded or
// bundled in production — not even as dead code. Static import + conditional
// render works with Vite's tree-shaking but this is explicit and guaranteed.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({
        default: m.ReactQueryDevtools,
      }))
    )
  : null;

// ─── Root element guard ───────────────────────────────────────────────────────
// FIX #4: getElementById can return null (wrong id in index.html, SSR mismatch,
// etc.). createRoot(null) throws a cryptic error in prod with no context.
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    '[main.jsx] Could not find #root element. ' +
    'Check that index.html contains <div id="root"></div>.'
  );
}

// ─── Root Render ──────────────────────────────────────────────────────────────
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {ReactQueryDevtools && (
        // Suspense needed because ReactQueryDevtools is lazy in dev
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  </StrictMode>
);