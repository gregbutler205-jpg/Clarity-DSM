// ClarityDSM mark: a "C" arc in --primary, a two-tone pink medical cross,
// and two small leaves at the base.
export default function Logo({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="ClarityDSM logo"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* C arc */}
      <path
        d="M45 14 A22 22 0 1 0 45 50"
        stroke="#7A2E5E"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* cross */}
      <rect x="28.5" y="19" width="7" height="26" rx="3.5" fill="#F4A6C0" />
      <rect x="19" y="28.5" width="26" height="7" rx="3.5" fill="#C75D8B" />
      {/* leaves */}
      <path
        d="M32 48 C 28 52 23 52 20.5 49.5 C 25 47 30 47 32 48 Z"
        fill="#C75D8B"
      />
      <path
        d="M32 48 C 36 52 41 52 43.5 49.5 C 39 47 34 47 32 48 Z"
        fill="#F4A6C0"
      />
    </svg>
  )
}
