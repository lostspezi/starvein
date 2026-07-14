/**
 * Re-Export-Shim: der Job-Contract lebt in packages/shared, damit die
 * Desktop-App (apps/desktop) dasselbe Schema konsumiert. Bestehende
 * Web-Imports bleiben über diesen Pfad gültig.
 */
export * from "@starvein/shared/refinery-jobs";
