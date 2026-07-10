type BoostListener = () => void;

const listeners = new Set<BoostListener>();

/**
 * Mini-Event-Bus zwischen Router und Starfield-Engine: der RouteListener
 * feuert boostDrift() bei Navigation, die Engine abonniert onBoost() —
 * ohne direkte Kopplung zwischen beiden.
 */
export function onBoost(listener: BoostListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function boostDrift(): void {
  for (const listener of listeners) {
    listener();
  }
}
