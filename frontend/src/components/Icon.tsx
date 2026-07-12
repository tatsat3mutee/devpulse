import { SVGProps } from "react";

type IconName =
  | "home"
  | "layers"
  | "rss"
  | "wrench"
  | "play"
  | "book"
  | "target"
  | "link"
  | "search"
  | "settings"
  | "menu"
  | "close"
  | "refresh"
  | "bookmark"
  | "bookmark-filled"
  | "arrow-right"
  | "arrow-left"
  | "external"
  | "spark"
  | "clock"
  | "trending"
  | "star"
  | "github"
  | "youtube"
  | "doc"
  | "chat"
  | "newspaper"
  | "code"
  | "sun"
  | "moon"
  | "user"
  | "share"
  | "more"
  | "calendar"
  | "check";

interface Props extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

// Lucide-style: 24x24 viewBox, 1.75 stroke, round caps & joins.
export default function Icon({ name, size = 16, className = "", ...rest }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
    ...rest,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
      );
    case "rss":
      return (
        <svg {...common}>
          <path d="M4 11a9 9 0 0 1 9 9" />
          <path d="M4 4a16 16 0 0 1 16 16" />
          <circle cx="5" cy="19" r="1.4" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0 5 5L21 11l-9 9-7-7 9-9 .7 1.3Z" />
        </svg>
      );
    case "play":
      return (
        <svg {...common}>
          <polygon points="6 4 20 12 6 20 6 4" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5z" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.4" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 1 0-5.6-5.6L11 7.5" />
          <path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 1 0 5.6 5.6L13 16.5" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 20 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M6 18 18 6" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 4v5h-5" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...common}>
          <path d="M6 4h12v17l-6-4-6 4z" />
        </svg>
      );
    case "bookmark-filled":
      return (
        <svg {...common} fill="currentColor" stroke="currentColor">
          <path d="M6 4h12v17l-6-4-6 4z" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...common}>
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
      );
    case "external":
      return (
        <svg {...common}>
          <path d="M14 4h6v6" />
          <path d="M20 4 10 14" />
          <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "trending":
      return (
        <svg {...common}>
          <path d="m3 17 6-6 4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z" />
        </svg>
      );
    case "github":
      return (
        <svg {...common}>
          <path d="M9 19c-4.5 1.5-4.5-2-6-2.5M15 22v-3.9c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6 0-1.3-.5-2.4-1.3-3.2.1-.3.5-1.6-.1-3.3 0 0-1-.3-3.4 1.2a11.7 11.7 0 0 0-6.2 0C6.6 2.7 5.6 3 5.6 3c-.6 1.7-.2 3-.1 3.3A4.5 4.5 0 0 0 4.2 9.5c0 4.6 2.7 5.7 5.5 6-.4.4-.7.9-.7 1.7V22" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <path d="M22 8.2A2.8 2.8 0 0 0 20 6.2C18.3 5.8 12 5.8 12 5.8s-6.3 0-8 .4A2.8 2.8 0 0 0 2 8.2 29 29 0 0 0 1.6 12 29 29 0 0 0 2 15.8 2.8 2.8 0 0 0 4 17.8c1.7.4 8 .4 8 .4s6.3 0 8-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22.4 12 29 29 0 0 0 22 8.2Z" />
          <path d="m10 15 5-3-5-3z" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
          <path d="M14 3v5h5" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-8 8H4l3-3a8 8 0 1 1 14-5Z" />
        </svg>
      );
    case "newspaper":
      return (
        <svg {...common}>
          <path d="M4 5h13a1 1 0 0 1 1 1v13a1 1 0 0 0 1 1 1 1 0 0 0 1-1V8" />
          <path d="M4 5v14a1 1 0 0 0 1 1h13" />
          <path d="M8 9h6M8 12h6M8 15h6" />
        </svg>
      );
    case "code":
      return (
        <svg {...common}>
          <path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.7 10.7 6.6-3.4M8.7 13.3l6.6 3.4" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v3M16 3v3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M4 12l5 5L20 7" />
        </svg>
      );
    default:
      return null;
  }
}
