{/* Add this case to the switch (name) block in Icon.tsx */}

    case "{{icon-name}}":
      return (
        <svg {...common}>
          {/* Use Lucide-style SVG paths in a 24x24 viewBox.
              The common object provides:
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"

              Use <path>, <circle>, <rect>, <polygon>, or <line> elements.
              Examples:
                <path d="M3 12h18" />
                <circle cx="12" cy="12" r="9" />
                <rect x="3" y="3" width="18" height="18" rx="2" />

              For filled variants, override fill on the svg:
                <svg {...common} fill="currentColor" stroke="currentColor">
          */}
          <path d="{{SVG_PATH_DATA}}" />
        </svg>
      );
