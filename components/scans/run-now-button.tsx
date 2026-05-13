"use client";

import { Play } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { runScanNowAction } from "@/app/scans/actions";

export function RunNowButton({ scanId }: { scanId: string }) {
  return (
    <form action={runScanNowAction}>
      <input type="hidden" name="id" value={scanId} />
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Play className="h-3.5 w-3.5" />
      {pending ? "Running…" : "Run now"}
    </Button>
  );
}
