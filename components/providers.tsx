"use client";

import { ThemeProvider } from "next-themes";
import { type ReactNode } from "react";
import { LayoutModeProvider } from "@/lib/layout-mode";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <LayoutModeProvider>{children}</LayoutModeProvider>
    </ThemeProvider>
  );
}
