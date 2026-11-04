export function SplixLogo({ className = "h-8 w-auto" }) {
  return (
    <div className={`inline-flex items-center gap-2 text-ink-900 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="splix-gradient-ui" x1="10" y1="30" x2="30" y2="10" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22c55e" />
            <stop offset="1" stopColor="#84cc16" />
          </linearGradient>
        </defs>
        <path d="M10 30 L30 10" stroke="url(#splix-gradient-ui)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="12" cy="14" r="4" fill="currentColor" />
        <circle cx="28" cy="26" r="4" fill="currentColor" />
      </svg>
      <span className="text-leaf-700 text-xl font-extrabold tracking-tight">Splix</span>
    </div>
  );
}
