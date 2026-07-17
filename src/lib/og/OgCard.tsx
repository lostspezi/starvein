import type { RarityTier } from "@/features/ores/ores.schema";
import { SITE_URL } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 };

/** Rarity-Farbtokens aus dem Design-System (globals.css @theme). */
export const RARITY_COLORS: Record<RarityTier, string> = {
  common: "#8b95b0",
  uncommon: "#4c9ef0",
  rare: "#a78bfa",
  epic: "#e0a83c",
  legendary: "#f06c9e",
};

export type OgChip = { label: string; color?: string };

export type OgCardProps = {
  /** Kontext-Label rechts oben (z. B. "Star Citizen Mining Reference"). */
  kicker?: string;
  /** Kleine farbige Zeile über dem Titel (z. B. Rarity · Methoden). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  chips?: OgChip[];
  /** Wordmark links oben ausblenden, wenn der Titel selbst die Marke ist. */
  showWordmark?: boolean;
};

/** Titelgröße an die Länge anpassen — satori kann nicht selbst schrumpfen. */
export function titleFontSize(title: string): number {
  if (title.length > 48) return 48;
  if (title.length > 26) return 64;
  return 84;
}

const DOMAIN = new URL(SITE_URL).host;

/**
 * 1200×630-Karte im "Tiefes All 2.0"-Look für satori/ImageResponse.
 * Satori-Regeln: nur Inline-Styles, jedes Mehr-Kind-Div braucht display:flex.
 */
export function OgCard({
  kicker,
  eyebrow,
  title,
  subtitle,
  chips = [],
  showWordmark = true,
}: OgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 64px",
        backgroundColor: "#0a0e1a",
        backgroundImage:
          "radial-gradient(circle at 18% 12%, rgba(124, 108, 240, 0.25), transparent 55%), radial-gradient(circle at 85% 85%, rgba(76, 158, 240, 0.2), transparent 50%)",
        color: "#e8eaf5",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: 32,
            letterSpacing: 10,
            color: "#b8e8ff",
          }}
        >
          {showWordmark ? "STARVEIN" : ""}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 3,
            color: "#8b95b0",
          }}
        >
          {kicker ?? ""}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {eyebrow ? (
          <div
            style={{
              display: "flex",
              fontFamily: "JetBrains Mono",
              fontSize: 26,
              letterSpacing: 4,
              color: "#5ee6ff",
            }}
          >
            {eyebrow.toUpperCase()}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontSize: titleFontSize(title),
            fontWeight: 600,
            lineHeight: 1.05,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.4,
              color: "#8b95b0",
              maxWidth: 960,
            }}
          >
            {subtitle}
          </div>
        ) : null}
        {chips.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {chips.map((chip) => (
              <div
                key={chip.label}
                style={{
                  display: "flex",
                  border: `2px solid ${chip.color ?? "rgba(94, 230, 255, 0.35)"}`,
                  borderRadius: 999,
                  padding: "10px 26px",
                  fontSize: 27,
                  color: chip.color ?? "#e8eaf5",
                  backgroundColor: "rgba(19, 26, 46, 0.7)",
                }}
              >
                {chip.label}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            height: 6,
            width: "100%",
            borderRadius: 3,
            backgroundImage: "linear-gradient(90deg, #5ee6ff, #7c6cf0)",
          }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: 24,
            color: "#8b95b0",
          }}
        >
          {DOMAIN}
        </div>
      </div>
    </div>
  );
}
