# Styling ChatKit Apps

This guide covers how to customize the appearance of ChatKit applications, including both the outer app shell and the ChatKit SDK's internal styles.

## Architecture Overview

ChatKit apps have three layers of styling:

1. **Global styles** - Body/root element (`index.css`, `tailwind.config.ts`)
2. **App shell** - Header, container, panel wrapper (`App.tsx`)
3. **ChatKit SDK** - Internal chat UI rendered in an iframe (`ChatKitPanel.tsx` theme config)

## Styling Each Layer

### 1. Global Styles (Tailwind Config)

Define base colors in `tailwind.config.ts`:

```typescript
colors: {
  surface: {
    light: "#f8f6f1",  // cream background
    dark: "#0b1120",
  },
},
```

Apply in `index.css`:

```css
body {
  @apply bg-surface-light text-slate-900;
}
.dark body {
  @apply bg-surface-dark text-slate-100;
}
```

### 2. App Shell (App.tsx)

The app container and header use Tailwind classes directly:

```tsx
// Container gradient
const containerClass = clsx(
  "h-full bg-gradient-to-br",
  scheme === "dark"
    ? "from-slate-900 via-slate-950 to-slate-850"
    : "from-[#f8f6f1] via-[#faf9f5] to-[#f8f6f1]"  // cream gradient
);

// Header bar
const headerBarClass = clsx(
  "sticky top-0 z-30 backdrop-blur",
  scheme === "dark"
    ? "bg-slate-950/80"
    : "bg-[#f8f6f1]/90"  // cream with transparency
);

// Chat panel wrapper
<ChatKitPanel className="bg-[#f8f6f1]/80 dark:bg-slate-900/70" />
```

### 3. ChatKit SDK Theme (ChatKitPanel.tsx)

The ChatKit SDK renders in an iframe with its own styles. Configure via the `theme` prop:

```tsx
const chatkit = useChatKit({
  theme: {
    density: "spacious",
    colorScheme: theme,  // "light" or "dark"
    color: {
      // Surface controls the main background inside ChatKit
      ...(theme === "light" ? {
        surface: {
          background: "#f8f6f1",  // main chat area
          foreground: "#faf9f5"   // secondary surfaces
        }
      } : {}),
      // Grayscale controls text and border tones
      grayscale: {
        hue: 220,
        tint: 6,
        shade: theme === "dark" ? -1 : -4,
      },
      // Accent controls buttons and highlights
      accent: {
        primary: theme === "dark" ? "#f1f5f9" : "#0f172a",
        level: 1,
      },
    },
    radius: "round",  // or "pill", "square"
  },
});
```

## Key Theme Options

| Option | Description |
|--------|-------------|
| `surface.background` | Main chat area background color |
| `surface.foreground` | Secondary surfaces (cards, widgets) |
| `grayscale.hue` | Base hue for grays (0-360) |
| `grayscale.tint` | Warmth of grays |
| `grayscale.shade` | Darkness adjustment |
| `accent.primary` | Button and link colors |
| `density` | `"compact"`, `"default"`, `"spacious"` |
| `radius` | `"square"`, `"round"`, `"pill"` |

## Font Configuration

Fonts also have two layers: the app shell (Tailwind) and the ChatKit SDK.

### App Shell Fonts (Tailwind)

Configure in `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    fontFamily: {
      sans: [
        "Inter",           // Primary font
        "system-ui",       // Fallbacks
        "-apple-system",
        "sans-serif",
      ],
    },
  },
},
```

Load the font in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### ChatKit SDK Fonts

Configure via the `theme.typography` option. Create a font sources file:

```typescript
// src/lib/fonts.ts
import type { FontObject } from "@openai/chatkit";

export const CUSTOM_FONT_SOURCES: FontObject[] = [
  {
    family: "Inter",
    src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2",
    weight: 400,
    style: "normal",
    display: "swap",
  },
  {
    family: "Inter",
    src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2",
    weight: 500,
    style: "normal",
    display: "swap",
  },
  {
    family: "Inter",
    src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff2",
    weight: 600,
    style: "normal",
    display: "swap",
  },
  {
    family: "Inter",
    src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2",
    weight: 700,
    style: "normal",
    display: "swap",
  },
];
```

Then apply in `ChatKitPanel.tsx`:

```tsx
import { CUSTOM_FONT_SOURCES } from "../lib/fonts";

const chatkit = useChatKit({
  theme: {
    // ... other theme options
    typography: {
      fontFamily: "Inter, sans-serif",
      fontSources: CUSTOM_FONT_SOURCES,
    },
  },
});
```

### FontObject Properties

| Property | Description |
|----------|-------------|
| `family` | Font family name (must match `fontFamily` in typography) |
| `src` | URL to the font file (woff2 recommended) |
| `weight` | Font weight (400, 500, 600, 700, etc.) |
| `style` | `"normal"` or `"italic"` |
| `display` | Font display strategy (`"swap"` recommended) |

## Tips

- The ChatKit iframe has its own styles that **cannot** be overridden with CSS
- Use the `theme.color.surface` object to control ChatKit's internal background
- Apply transparency (`/80`) to panel wrappers for backdrop blur effects
- Test both light and dark modes - they're configured separately
- For custom fonts in ChatKit, you must provide both `fontFamily` and `fontSources`
- Use woff2 format for best browser support and performance
