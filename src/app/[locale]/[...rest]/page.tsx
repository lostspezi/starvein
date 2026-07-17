import { notFound } from "next/navigation";

/**
 * Catch-all unterhalb von [locale] (next-intl-Pattern): unbekannte Pfade
 * landen in der lokalisierten not-found.tsx statt auf der Default-404.
 */
export default function CatchAllPage() {
  notFound();
}
