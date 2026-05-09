import { Settings } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function SettingsPage() {
  return (
    <Shell>
      <PhasePlaceholder
        title="Settings"
        phase={7}
        Icon={Settings}
        description="Notification preferences (push + Slack webhook + SMS stub), theme, layout mode, and password. Coming in phase 7."
      />
    </Shell>
  );
}
