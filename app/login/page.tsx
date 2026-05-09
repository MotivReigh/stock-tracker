import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAction } from "./actions";

const ERROR_COPY: Record<string, string> = {
  invalid: "Incorrect password.",
  server_misconfigured: "Server is missing APP_PASSWORD or AUTH_TOKEN.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? ERROR_COPY[params.error] : undefined;

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-terminal-500 to-terminal-700 grid place-items-center">
            <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-semibold tracking-tight">Updraft</span>
        </div>

        <div className="bg-panel border border-app rounded-lg p-6 shadow-sm">
          <h1 className="text-lg font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-muted mb-5">
            Personal use only. Not financial advice.
          </p>

          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="from" value={params.from ?? "/"} />
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                required
                autoComplete="current-password"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
            )}

            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </div>

        <p className="text-[11px] text-muted text-center mt-4">
          Updraft v0.1 · Trade at your own risk
        </p>
      </div>
    </div>
  );
}
