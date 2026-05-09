import { type ReactNode } from "react";
import { DisclaimerBar } from "./disclaimer-bar";
import { TopNav } from "./top-nav";
import { SideNav } from "./side-nav";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <DisclaimerBar />
      <TopNav />
      <div className="flex flex-1">
        <SideNav />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <footer className="text-center text-[11px] text-muted py-4 border-t border-app">
        Updraft · Personal use only · Not financial advice · Trade at your own
        risk
      </footer>
    </div>
  );
}
