"use client";

import { useLayoutMode } from "@/lib/layout-mode";
import { TerminalLayout } from "./terminal-layout";
import { EditorialLayout } from "./editorial-layout";
import type { DashboardData } from "@/lib/dashboard/data";

export function Dashboard({ data }: { data: DashboardData }) {
  const { mode } = useLayoutMode();
  return mode === "editorial" ? (
    <EditorialLayout data={data} />
  ) : (
    <TerminalLayout data={data} />
  );
}
