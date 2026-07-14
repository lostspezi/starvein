/**
 * Re-Export-Shim: die Countdown-Logik lebt in packages/shared, damit die
 * Desktop-App dieselbe Ready-Berechnung nutzt (kein Drift zwischen Apps).
 */
export * from "@starvein/shared/job-time";
