/**
 * Stilisierte HUD-Illustrationen der vier Companion-Schritte. Bewusst SVG
 * statt Screenshots: keine Spielinhalte im Repo (CLAUDE.md §2), immer im
 * Design-System. Echte App-Screenshots können später ergänzt werden.
 */
const FRAME = {
  width: 320,
  height: 180,
  className: "h-auto w-full",
  role: "img" as const,
};

const frameProps = (label: string) => ({
  viewBox: `0 0 ${FRAME.width} ${FRAME.height}`,
  className: FRAME.className,
  role: FRAME.role,
  "aria-label": label,
});

const panel = {
  fill: "var(--color-bg-nebula)",
  stroke: "var(--color-glass-border)",
} as const;

function Window({ children }: { children: React.ReactNode }) {
  return (
    <>
      <rect x="8" y="8" width="304" height="164" rx="8" {...panel} />
      <rect
        x="8"
        y="8"
        width="304"
        height="24"
        rx="8"
        fill="var(--color-bg-nebula-2)"
      />
      <circle
        cx="24"
        cy="20"
        r="4"
        fill="var(--color-accent-cyan)"
        opacity="0.6"
      />
      <text
        x="36"
        y="24"
        fontSize="10"
        fontFamily="monospace"
        fill="var(--color-text-muted)"
      >
        STARVEIN COMPANION
      </text>
      {children}
    </>
  );
}

export function LoginIllustration({ label }: { label: string }) {
  return (
    <svg {...frameProps(label)}>
      <Window>
        <text
          x="160"
          y="70"
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-text-muted)"
        >
          ▸ Discord
        </text>
        <rect
          x="100"
          y="84"
          width="120"
          height="34"
          rx="4"
          fill="var(--color-bg-void)"
          stroke="var(--color-accent-cyan)"
          strokeOpacity="0.4"
        />
        <text
          x="160"
          y="106"
          textAnchor="middle"
          fontSize="16"
          fontFamily="monospace"
          letterSpacing="3"
          fill="var(--color-accent-cyan)"
        >
          K7E-8QH9
        </text>
        <text
          x="160"
          y="140"
          textAnchor="middle"
          fontSize="9"
          fill="var(--color-text-muted)"
        >
          ● ● ●
        </text>
      </Window>
    </svg>
  );
}

export function HotkeyIllustration({ label }: { label: string }) {
  return (
    <svg {...frameProps(label)}>
      <rect
        x="8"
        y="8"
        width="304"
        height="164"
        rx="8"
        fill="var(--color-bg-void)"
        stroke="var(--color-glass-border)"
      />
      <rect
        x="24"
        y="24"
        width="180"
        height="10"
        rx="2"
        fill="var(--color-bg-nebula-2)"
      />
      <rect
        x="24"
        y="44"
        width="140"
        height="8"
        rx="2"
        fill="var(--color-bg-nebula-2)"
      />
      <rect
        x="24"
        y="60"
        width="160"
        height="8"
        rx="2"
        fill="var(--color-bg-nebula-2)"
      />
      <rect
        x="24"
        y="76"
        width="120"
        height="8"
        rx="2"
        fill="var(--color-bg-nebula-2)"
      />
      {["CTRL", "ALT", "R"].map((key, index) => (
        <g key={key} transform={`translate(${96 + index * 52}, 116)`}>
          <rect
            width={key.length > 1 ? 46 : 30}
            height="30"
            rx="5"
            fill="var(--color-bg-nebula-2)"
            stroke="var(--color-accent-cyan)"
            strokeOpacity="0.7"
          />
          <text
            x={key.length > 1 ? 23 : 15}
            y="20"
            textAnchor="middle"
            fontSize="11"
            fontFamily="monospace"
            fill="var(--color-accent-ice)"
          >
            {key}
          </text>
        </g>
      ))}
      <text
        x="88"
        y="134"
        textAnchor="end"
        fontSize="14"
        fill="var(--color-accent-cyan)"
      >
        ⌨
      </text>
    </svg>
  );
}

export function ConfirmIllustration({ label }: { label: string }) {
  return (
    <svg {...frameProps(label)}>
      <Window>
        {[
          ["QUAN", "32 SCU"],
          ["LARA", "12.5 SCU"],
        ].map(([code, amount], index) => (
          <g key={code} transform={`translate(24, ${48 + index * 26})`}>
            <rect
              width="180"
              height="18"
              rx="3"
              fill="var(--color-bg-void)"
              stroke="var(--color-glass-border)"
            />
            <text
              x="8"
              y="13"
              fontSize="10"
              fontFamily="monospace"
              fill="var(--color-text-primary)"
            >
              {code}
            </text>
            <text
              x="172"
              y="13"
              textAnchor="end"
              fontSize="10"
              fontFamily="monospace"
              fill="var(--color-accent-secondary)"
            >
              {amount}
            </text>
          </g>
        ))}
        <text x="24" y="118" fontSize="9" fill="var(--color-text-muted)">
          2h 05m · Dinyx
        </text>
        <rect
          x="214"
          y="130"
          width="82"
          height="24"
          rx="4"
          fill="var(--color-accent-primary)"
        />
        <text
          x="255"
          y="146"
          textAnchor="middle"
          fontSize="10"
          fontWeight="500"
          fill="var(--color-bg-void)"
        >
          ✓
        </text>
      </Window>
    </svg>
  );
}

export function NotifyIllustration({ label }: { label: string }) {
  return (
    <svg {...frameProps(label)}>
      <Window>
        <g transform="translate(24, 44)">
          <rect
            width="272"
            height="26"
            rx="4"
            fill="var(--color-bg-void)"
            stroke="var(--color-glass-border)"
          />
          <text x="10" y="17" fontSize="10" fill="var(--color-text-primary)">
            ARC-L1
          </text>
          <text
            x="262"
            y="17"
            textAnchor="end"
            fontSize="10"
            fontFamily="monospace"
            fill="var(--color-accent-secondary)"
          >
            1h 12m
          </text>
        </g>
        <g transform="translate(24, 78)">
          <rect
            width="272"
            height="26"
            rx="4"
            fill="var(--color-bg-void)"
            stroke="var(--color-success)"
            strokeOpacity="0.6"
          />
          <text x="10" y="17" fontSize="10" fill="var(--color-text-primary)">
            CRU-L1
          </text>
          <text
            x="262"
            y="17"
            textAnchor="end"
            fontSize="10"
            fill="var(--color-success)"
          >
            ✓
          </text>
        </g>
        <g transform="translate(180, 118)">
          <rect
            width="116"
            height="38"
            rx="5"
            fill="var(--color-bg-nebula-2)"
            stroke="var(--color-accent-cyan)"
            strokeOpacity="0.5"
          />
          <text x="10" y="16" fontSize="9" fill="var(--color-accent-ice)">
            ⏰ Ready!
          </text>
          <text x="10" y="30" fontSize="8" fill="var(--color-text-muted)">
            CRU-L1
          </text>
        </g>
      </Window>
    </svg>
  );
}
