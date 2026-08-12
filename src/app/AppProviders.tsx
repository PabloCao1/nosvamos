import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "../auth/AuthProvider";
import { InstallSheet } from "../components/ui/InstallSheet";
import { SyncCoordinator } from "../components/sync/SyncCoordinator";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 2, refetchOnReconnect: true, refetchOnWindowFocus: true } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SyncCoordinator />
        {children}
        <InstallSheet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
