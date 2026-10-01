import type { SVGProps } from "react";

// Thin line icons drawn for this app, so they match the hairline look. 24×24, currentColor.

const PATHS = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v11h13V9" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  budget: (
    <>
      <ellipse cx="12" cy="6.5" rx="7" ry="3" />
      <path d="M5 6.5v5.5c0 1.66 3.13 3 7 3s7-1.34 7-3V6.5" />
      <path d="M5 12v5.5c0 1.66 3.13 3 7 3s7-1.34 7-3V12" />
    </>
  ),
  vendors: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="1.5" />
      <path d="M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M3.5 12.5h17" />
    </>
  ),
  party: (
    <>
      <path d="M9.5 3.5h5" />
      <path d="M9.5 3.5 10.5 8h3l1-4.5" />
      <path d="M10.5 8 6 20.5h12L13.5 8" />
    </>
  ),
  guests: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.1a5 5 0 0 1 5.5 4.9" />
    </>
  ),
  seating: (
    <>
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="12" cy="20" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="20" cy="12" r="1.5" />
      <circle cx="6.3" cy="6.3" r="1.5" />
      <circle cx="17.7" cy="17.7" r="1.5" />
      <circle cx="17.7" cy="6.3" r="1.5" />
      <circle cx="6.3" cy="17.7" r="1.5" />
    </>
  ),
  tasks: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="1.5" />
      <path d="m8 9 1.5 1.5L12.5 7.5" />
      <path d="M14.5 9h2" />
      <path d="m8 15 1.5 1.5 3-3" />
      <path d="M14.5 15h2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4M16 3v4" />
      <circle cx="12" cy="15" r="1" />
    </>
  ),
  decisions: (
    <>
      <path d="M6 4.5h10.5A2.5 2.5 0 0 1 19 7v13H8.5A2.5 2.5 0 0 1 6 17.5z" />
      <path d="M6 17.5A2.5 2.5 0 0 1 8.5 15H19" />
      <path d="M10 8.5h5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  more: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.25" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.25" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.25" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.25" />
    </>
  ),
  timeline: (
    <>
      <path d="M7 3.5v17" />
      <circle cx="7" cy="7" r="1.75" />
      <circle cx="7" cy="12.5" r="1.75" />
      <circle cx="7" cy="18" r="1.75" />
      <path d="M11 7h8.5M11 12.5h6M11 18h7.5" />
    </>
  ),
  music: (
    <>
      <path d="M9.5 17.5V5.5l10-2v12" />
      <circle cx="7" cy="17.5" r="2.5" />
      <circle cx="17" cy="15.5" r="2.5" />
      <path d="M9.5 9.5l10-2" />
    </>
  ),
  camera: (
    <>
      <path d="M4.5 8h3l1.5-2.5h6L16.5 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  design: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.75-.8 1.75-1.7 0-.45-.2-.85-.45-1.15-.25-.3-.45-.7-.45-1.15 0-.95.75-1.7 1.7-1.7h2A4 4 0 0 0 20.5 11 7.8 7.8 0 0 0 12 3.5z" />
      <circle cx="7.75" cy="11" r="1" />
      <circle cx="10" cy="7.25" r="1" />
      <circle cx="14.5" cy="7.25" r="1" />
    </>
  ),
  plane: <path d="M10.5 4.5a1.5 1.5 0 0 1 3 0V10l7 4v2l-7-2v4l2 1.5V21L12 20l-3.5 1v-1.5l2-1.5v-4l-7 2v-2l7-4z" />,
  travel: (
    <>
      <rect x="4.5" y="7.5" width="15" height="12" rx="1.5" />
      <path d="M9 7.5V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5" />
      <path d="M8.5 7.5v12M15.5 7.5v12" />
    </>
  ),
  meals: (
    <>
      <circle cx="12" cy="13" r="6" />
      <path d="M3.5 4v5a2 2 0 0 0 2 2V20M3.5 4v4M5.5 4v4" />
      <path d="M20.5 20V4c-1.5.5-2.5 2.5-2.5 5v3h2.5" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="4" rx="1" />
      <path d="M5.5 13v7.5h13V13M12 9v11.5" />
      <path d="M12 9c-1.5-3.5-5.5-4-5.5-1.5C6.5 9 9.5 9 12 9zM12 9c1.5-3.5 5.5-4 5.5-1.5C17.5 9 14.5 9 12 9z" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  star: <path d="m12 4 2.3 4.9 5.2.6-3.9 3.6 1.1 5.2L12 15.7l-4.7 2.6 1.1-5.2-3.9-3.6 5.2-.6z" />,
  logout: (
    <>
      <path d="M14 4.5h4.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H14" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.25" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
