import { MessageCircle } from "lucide-react";

export function SmsSetup() {
  return (
    <section className="border border-app rounded-md bg-panel p-4 space-y-3 opacity-70">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 grid place-items-center">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold flex items-center gap-2">
            SMS
            <span className="text-[10px] uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
              Coming soon
            </span>
          </h3>
          <p className="text-xs text-muted">
            Twilio-shaped adapter is stubbed in the codebase. Real SMS delivery
            is post-MVP — likely will require a Twilio account and a verified
            number.
          </p>
        </div>
      </div>
    </section>
  );
}
