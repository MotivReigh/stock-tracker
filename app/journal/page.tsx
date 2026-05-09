import { BookOpenText } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function JournalPage() {
  return (
    <Shell>
      <PhasePlaceholder
        title="Journal"
        phase={8}
        Icon={BookOpenText}
        description="Markdown notes per ticker for capturing entry rationale, exit thoughts, and observations. Coming in phase 8."
      />
    </Shell>
  );
}
