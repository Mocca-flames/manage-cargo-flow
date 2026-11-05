import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Admins leave the app open all day: refresh data whenever the tab
      // regains focus, and every 60s while it is visible.
      refetchOnWindowFocus: true,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  },
});
