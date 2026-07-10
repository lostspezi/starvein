import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Kombiniert Klassennamen (clsx-Syntax inkl. Bedingungsobjekten) und löst
 * Tailwind-Utility-Konflikte auf — die zuletzt angegebene Utility gewinnt.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
