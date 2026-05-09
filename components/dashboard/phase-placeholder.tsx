import { type LucideIcon } from "lucide-react";

type PhasePlaceholderProps = {
  title: string;
  phase: number;
  description: string;
  Icon: LucideIcon;
};

export function PhasePlaceholder({
  title,
  phase,
  description,
  Icon,
}: PhasePlaceholderProps) {
  return (
    <div className="p-6 md:p-10">
      <div className="max-w-xl">
        <div className="h-12 w-12 rounded-md bg-terminal-50 dark:bg-terminal-700/20 text-terminal-700 dark:text-terminal-300 grid place-items-center mb-4">
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
          Phase {phase}
        </div>
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
