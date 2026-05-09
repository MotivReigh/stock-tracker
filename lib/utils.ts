import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number, opts: { currency?: boolean } = {}): string {
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return opts.currency ? `$${formatted}` : formatted;
}

export function formatPercent(value: number, opts: { sign?: boolean } = { sign: true }): string {
  const sign = opts.sign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
