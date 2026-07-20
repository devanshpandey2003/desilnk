"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { MotionProvider } from "@/components/motion";

export default function Providers({ children }) {
  // Creating a queryClient for each session but rendering it globally correctly
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1, // Only retry once as default
            refetchOnWindowFocus: false, // Don't refetch on window focus
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MotionProvider>
        {children}
      </MotionProvider>
    </QueryClientProvider>
  );
}
