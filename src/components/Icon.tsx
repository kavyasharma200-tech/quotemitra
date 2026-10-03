// Hand-drawn minimal SVG icon set. No icon packs, no emoji.

export type IconName =
  | 'dashboard'
  | 'chat'
  | 'quote'
  | 'route'
  | 'settings'
  | 'plus'
  | 'x'
  | 'check'
  | 'send'
  | 'truck'
  | 'fuel'
  | 'rupee'
  | 'clock'
  | 'chevR'
  | 'chevD'
  | 'arrowR'
  | 'alert'
  | 'phone'
  | 'box'
  | 'pencil'
  | 'menu'
  | 'spark';

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <path d="M3.5 3.5h7v7h-7zM13.5 3.5h7v4.5h-7zM13.5 11h7v9.5h-7zM3.5 13.5h7V20.5h-7z" />
    </>
  ),
  chat: (
    <>
      <path d="M20.5 11.5a7.5 7.5 0 0 1-7.5 7.5c-1.2 0-2.4-.3-3.4-.8L4 20l1.9-4.4a7.5 7.5 0 1 1 14.6-4.1Z" />
      <path d="M8.5 11.5h7M8.5 14.5h4.5" />
    </>
  ),
  quote: (
    <>
      <path d="M6 3.5h9L19 7.5V20.5H6z" />
      <path d="M14.5 3.5v4H19" />
      <path d="M9 12.5h6M9 16h6" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18.5" r="2.3" />
      <circle cx="18" cy="5.5" r="2.3" />
      <path d="M8.3 18.5H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.7" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7.5h9M17.5 7.5H20M4 16.5h4M12.5 16.5H20" />
      <circle cx="15" cy="7.5" r="2.3" />
      <circle cx="10" cy="16.5" r="2.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M17.5 6.5 6.5 17.5M6.5 6.5l11 11" />,
  check: <path d="M20 6.5 9.5 17l-5-5" />,
  send: <path d="M21.5 2.5 11 13M21.5 2.5 14.8 21.5l-3.8-8.5-8.5-3.8z" />,
  truck: (
    <>
      <path d="M2 7.5h12.5V16H2zM14.5 10.5h3.8l3.2 3.2V16h-7z" />
      <circle cx="6.5" cy="18" r="1.9" />
      <circle cx="17.5" cy="18" r="1.9" />
    </>
  ),
  fuel: (
    <>
      <path d="M4.5 20.5v-13a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v13" />
      <path d="M3.5 20.5h11M13.5 10h1.8a2 2 0 0 1 2 2v5.5a1.6 1.6 0 0 0 3.2 0V9.6a2 2 0 0 0-.6-1.4l-1.6-1.7" />
      <path d="M7.5 8.5h3v3h-3z" />
    </>
  ),
  rupee: (
    <>
      <path d="M6.5 4.5h11M6.5 9h11" />
      <path d="M6.5 4.5c5.5 0 8 1.8 8 4.5s-2.5 4.5-8 4.5l8 7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.5 2" />
    </>
  ),
  chevR: <path d="m9.5 6 6 6-6 6" />,
  chevD: <path d="m6 9.5 6 6 6-6" />,
  arrowR: <path d="M4.5 12h15m-6-6 6 6-6 6" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5M12 16.2v.1" />
    </>
  ),
  phone: (
    <path d="M21.5 16.5v2.8a1.8 1.8 0 0 1-2 1.8 19.5 19.5 0 0 1-8.5-3 19.2 19.2 0 0 1-5.9-5.9 19.5 19.5 0 0 1-3-8.5 1.8 1.8 0 0 1 1.8-2h2.8a1.8 1.8 0 0 1 1.8 1.5c.1.9.3 1.8.6 2.6a1.8 1.8 0 0 1-.4 1.9l-1.2 1.2a16 16 0 0 0 5.9 5.9l1.2-1.2a1.8 1.8 0 0 1 1.9-.4c.8.3 1.7.5 2.6.6a1.8 1.8 0 0 1 1.6 1.7Z" />
  ),
  box: (
    <>
      <path d="M20.5 8 12 3.5 3.5 8v8L12 20.5l8.5-4.5z" />
      <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" />
    </>
  ),
  pencil: <path d="M16.5 3.5a2.7 2.7 0 1 1 3.9 3.9L8 19.8 3 21.5l1.7-5z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  spark: (
    <path d="M12 2.5 13.8 10l7.7 2-7.7 2L12 21.5 10.2 14l-7.7-2 7.7-2z" />
  ),
};

export function Icon({
  name,
  size = 18,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
