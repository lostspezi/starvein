/**
 * Remountet bei jeder Navigation und blendet den Seiteninhalt weich ein
 * (200 ms Fade). Der Starfield-Drift-Boost läuft unabhängig davon über den
 * StarfieldRouteListener; reduced-motion beendet den Fade global sofort.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in flex flex-1 flex-col">{children}</div>;
}
