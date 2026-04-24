/**
 * Decorative illustration panel for the auth pages.
 * Replace the inner SVG with a final asset when available.
 */
export function AuthIllustration() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-primary text-primary-foreground">
      {/* Soft radial highlights */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.18),transparent_50%)]" />

      {/* Cloud shapes */}
      <div className="pointer-events-none absolute left-10 top-16 h-16 w-32 rounded-full bg-white/25 blur-xl" />
      <div className="pointer-events-none absolute right-12 top-10 h-20 w-40 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute bottom-16 right-24 h-24 w-48 rounded-full bg-white/15 blur-2xl" />

      {/* Abstract skyline illustration */}
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 h-auto w-3/4 max-w-md drop-shadow-xl"
        aria-hidden="true"
      >
        {/* Ground */}
        <ellipse cx="200" cy="340" rx="160" ry="18" fill="rgba(0,0,0,0.12)" />

        {/* Tall building */}
        <rect
          x="110"
          y="120"
          width="80"
          height="210"
          rx="6"
          fill="white"
          fillOpacity="0.95"
        />
        <rect
          x="125"
          y="140"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="145"
          y="140"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="165"
          y="140"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="125"
          y="165"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="145"
          y="165"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="165"
          y="165"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="125"
          y="190"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="145"
          y="190"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="165"
          y="190"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="125"
          y="215"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="145"
          y="215"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="165"
          y="215"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="125"
          y="240"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="145"
          y="240"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="165"
          y="240"
          width="14"
          height="14"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="135"
          y="295"
          width="30"
          height="35"
          rx="2"
          fill="currentColor"
          fillOpacity="0.25"
        />

        {/* House with pitched roof */}
        <path
          d="M210 220 L260 175 L310 220 L310 330 L210 330 Z"
          fill="white"
          fillOpacity="0.98"
        />
        <rect
          x="245"
          y="275"
          width="30"
          height="55"
          rx="2"
          fill="currentColor"
          fillOpacity="0.25"
        />
        <rect
          x="220"
          y="240"
          width="20"
          height="20"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="282"
          y="240"
          width="20"
          height="20"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
        />

        {/* Small side building */}
        <rect
          x="60"
          y="200"
          width="50"
          height="130"
          rx="4"
          fill="white"
          fillOpacity="0.85"
        />
        <rect
          x="70"
          y="215"
          width="10"
          height="10"
          rx="1.5"
          fill="currentColor"
          fillOpacity="0.2"
        />
        <rect
          x="88"
          y="215"
          width="10"
          height="10"
          rx="1.5"
          fill="currentColor"
          fillOpacity="0.2"
        />
        <rect
          x="70"
          y="235"
          width="10"
          height="10"
          rx="1.5"
          fill="currentColor"
          fillOpacity="0.2"
        />
        <rect
          x="88"
          y="235"
          width="10"
          height="10"
          rx="1.5"
          fill="currentColor"
          fillOpacity="0.2"
        />
        <rect
          x="70"
          y="255"
          width="10"
          height="10"
          rx="1.5"
          fill="currentColor"
          fillOpacity="0.2"
        />
        <rect
          x="88"
          y="255"
          width="10"
          height="10"
          rx="1.5"
          fill="currentColor"
          fillOpacity="0.2"
        />

        {/* Key motif in top-right */}
        <g
          transform="translate(300 80)"
          stroke="white"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        >
          <circle cx="14" cy="14" r="12" />
          <path d="M24 18 L52 46" />
          <path d="M46 40 L42 44" />
          <path d="M52 46 L48 50" />
        </g>
      </svg>
    </div>
  );
}
