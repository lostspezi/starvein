/**
 * Dekorative Mining-Schiffe (Prospector & MOLE), die langsam durchs Bild
 * driften — eigene, stilisierte Silhouetten (Fan-Art), KEINE CIG-Assets
 * (CLAUDE.md §2). Nur ab lg sichtbar, rein CSS-animiert; die Basisposition
 * liegt offscreen, sodass bei reduced-motion (globaler Kill-Switch) nichts
 * im Viewport steht. Server-Komponente ohne JS-Kosten.
 */
export function DriftingShips() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden lg:block"
    >
      <div
        data-ship-track
        className="ship-drift-prospector absolute top-[16%]"
        style={{ left: "-20%" }}
      >
        <div className="ship-bob">
          <ProspectorSilhouette />
        </div>
      </div>

      <div
        data-ship-track
        className="ship-drift-mole absolute top-[64%]"
        style={{ left: "-20%" }}
      >
        <div className="ship-bob-slow">
          <MoleSilhouette />
        </div>
      </div>
    </div>
  );
}

/** Kompaktes Ein-Mann-Mining-Schiff: schlanker Rumpf, Arm unter der Nase. */
function ProspectorSilhouette() {
  return (
    <svg
      data-ship="prospector"
      viewBox="0 0 160 64"
      className="w-32 opacity-50 xl:w-36"
    >
      {/* Triebwerksglühen */}
      <ellipse
        cx="10"
        cy="34"
        rx="14"
        ry="6"
        className="fill-accent-cyan"
        opacity="0.18"
      />
      <ellipse
        cx="10"
        cy="34"
        rx="7"
        ry="3"
        className="fill-accent-cyan"
        opacity="0.55"
      />
      {/* Heckflosse */}
      <polygon points="24,27 32,9 38,27" className="fill-bg-nebula-2" />
      {/* Rumpf */}
      <path
        d="M8,34 C10,28 18,27 26,26 L52,22 C78,18 104,18 122,22 L142,28 C150,30 152,32 152,34 C148,39 132,41 118,42 L52,44 C28,44 12,40 8,34 Z"
        className="fill-bg-nebula-2 stroke-accent-cyan/25"
        strokeWidth="1"
      />
      {/* Cockpit */}
      <path
        d="M118,22 C126,15 136,17 142,26 L120,25 Z"
        className="fill-bg-nebula"
      />
      <path
        d="M124,20 L134,20"
        className="stroke-accent-ice/70"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Saddlebag-Container */}
      <rect
        x="62"
        y="42"
        width="9"
        height="7"
        rx="1.5"
        className="fill-bg-nebula-2"
      />
      <rect
        x="74"
        y="42"
        width="9"
        height="7"
        rx="1.5"
        className="fill-bg-nebula-2"
      />
      <rect
        x="86"
        y="42"
        width="9"
        height="7"
        rx="1.5"
        className="fill-bg-nebula-2"
      />
      <rect
        x="98"
        y="42"
        width="9"
        height="7"
        rx="1.5"
        className="fill-bg-nebula-2"
      />
      {/* Mining-Arm */}
      <path
        d="M126,42 L134,54 L140,52 L133,41 Z"
        className="fill-bg-nebula-2"
      />
      <circle
        cx="138"
        cy="54"
        r="3"
        className="fill-bg-nebula-2 stroke-accent-cyan/40"
        strokeWidth="1"
      />
    </svg>
  );
}

/** Wuchtiger Mehrmann-Miner: runder Rumpf, Kanzel vorn, Arme oben und unten. */
function MoleSilhouette() {
  return (
    <svg
      data-ship="mole"
      viewBox="0 0 220 90"
      className="w-44 -scale-x-100 opacity-50 xl:w-52"
    >
      {/* Triebwerksglühen */}
      <ellipse
        cx="20"
        cy="45"
        rx="16"
        ry="8"
        className="fill-accent-cyan"
        opacity="0.18"
      />
      <ellipse
        cx="20"
        cy="45"
        rx="8"
        ry="4"
        className="fill-accent-cyan"
        opacity="0.55"
      />
      {/* Triebwerksblock */}
      <rect
        x="22"
        y="31"
        width="24"
        height="28"
        rx="6"
        className="fill-bg-nebula-2"
      />
      {/* Zentralrumpf */}
      <rect
        x="42"
        y="27"
        width="120"
        height="36"
        rx="17"
        className="fill-bg-nebula-2 stroke-accent-cyan/25"
        strokeWidth="1"
      />
      {/* Rückenspant */}
      <rect
        x="70"
        y="22"
        width="52"
        height="8"
        rx="3"
        className="fill-bg-nebula-2"
      />
      {/* Cockpit-Kugel */}
      <circle
        cx="172"
        cy="45"
        r="17"
        className="fill-bg-nebula-2 stroke-accent-cyan/25"
        strokeWidth="1"
      />
      <path
        d="M178,36 A12,12 0 0 1 184,49"
        className="stroke-accent-ice/70"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Mining-Arm oben */}
      <path d="M116,27 L106,11 L114,8 L124,25 Z" className="fill-bg-nebula-2" />
      <circle
        cx="109"
        cy="9"
        r="5"
        className="fill-bg-nebula-2 stroke-accent-cyan/40"
        strokeWidth="1"
      />
      {/* Mining-Arm unten */}
      <path d="M98,63 L88,80 L96,83 L106,65 Z" className="fill-bg-nebula-2" />
      <circle
        cx="91"
        cy="81"
        r="5"
        className="fill-bg-nebula-2 stroke-accent-cyan/40"
        strokeWidth="1"
      />
      {/* Positionslichter */}
      <circle
        cx="58"
        cy="45"
        r="1.5"
        className="fill-accent-ice"
        opacity="0.6"
      />
      <circle
        cx="140"
        cy="33"
        r="1.5"
        className="fill-accent-ice"
        opacity="0.6"
      />
    </svg>
  );
}
