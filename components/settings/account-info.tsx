import { Lock, LogOut, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

export function AccountInfo() {
  return (
    <section className="border border-app rounded-md bg-panel p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 grid place-items-center">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Account</h3>
          <p className="text-xs text-muted">
            Updraft is a single-account personal app. The gate password lives
            in the <code className="font-mono">APP_PASSWORD</code> environment
            variable on Vercel.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-app bg-slate-50 dark:bg-slate-900/40 p-3 space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              Change password
            </p>
            <p className="text-muted leading-snug">
              Update the <code className="font-mono">APP_PASSWORD</code> env
              var in your Vercel project settings and redeploy. The session
              cookie remains valid until you sign out below.
            </p>
          </div>
        </div>
      </div>

      <form action={logoutAction}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-md border border-app bg-transparent px-3 h-8 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </form>
    </section>
  );
}
