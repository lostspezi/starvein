/** Validiert einen searchParams-Wert gegen eine Literal-Liste. */
export function parseEnumParam<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
}
