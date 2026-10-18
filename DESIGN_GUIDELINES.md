# Aurix Design Guidelines

Reference: the visual language of https://pencildesign.co/ (an AI jewelry design and commerce platform), measured from the live site on 2026-10-18. Values marked **(measured)** were read from the site's computed styles. Values marked **(recommended)** are our additions where the site gave no data. Use this as a structural and stylistic reference only. Aurix needs its own logo, copy, imagery and brand identity.

The ready-to-use tokens are in [`tokens.css`](tokens.css).

---

## 1. Design principles

1. **Quiet, monochrome canvas.** Near-black on white and off-white. The product imagery (the jewelry, the UI screenshots) is the only thing with color.
2. **Tight, confident type.** One typeface (Inter). Large semibold headlines with strong negative letter-spacing.
3. **Soft, floating surfaces.** Rounded corners, hairline borders, layered soft shadows. Nothing is flat or boxy.
4. **Generous whitespace.** 80px between sections, a centered container, short copy blocks.
5. **Product-first.** Hero and feature sections show the real product (screenshots in rounded frames) rather than abstract illustration.

## 2. Color

### Core palette (measured)

| Token | Hex | Use |
|---|---|---|
| `--black-900` | `#0C0407` | Headlines, primary button background, key text. Warm near-black, not pure `#000` |
| `--black-800` | `#333333` | Body copy, nav links |
| `--black-700` | `#4C4C4C` | Secondary text |
| `--black-600` | `#666666` | Tertiary text, captions |
| `--black-500` | `#808080` | Social icons, muted UI |
| `--black-400` | `#999999` | Placeholder, disabled text |
| `--black-300` | `#B3B3B3` | Disabled borders and icons |
| `--black-200` | `#CCCCCC` | Dividers |
| `--black-100` | `#E5E5E5` | Light dividers |
| `--black-50` | `#F9F9F9` | Subtle fills |
| `--primary-bg` | `#FAFAFA` | Card and CTA panel background |
| `--hero-bg` | `#F5F5F5` | Hero section background (under the dot pattern) |
| `--border-color` | `#E4E4E4` | 1px hairline borders on cards and panels |
| `--white` | `#FFFFFF` | Page background, nav, secondary buttons |
| `--white-50` | `#FFFFFF80` | Frosted overlays |
| `--primary-blue` | `#4C6FFF` | Declared accent. Use sparingly for links, focus rings, small highlights |

### Usage rules

- Page background is `#FFFFFF`. Alternate surfaces use `#FAFAFA` or `#F5F5F5`.
- Text hierarchy is `black-900` for headings, `black-800` for body, `black-600` for captions.
- The only chromatic color in the UI chrome is `#4C6FFF`, and the site barely uses it. Don't introduce more accent colors.
- Footer uses a vertical white-to-light-gray gradient (the site's `linear-gradient-180` class). **(recommended)** `linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%)`.
- Browser default link blue (`#0000EE`) shows up on unstyled links on the live site. That's a bug on their side, so always set explicit link colors.

### Contrast

`#0C0407` on white is about 19:1 and `#333` on white is about 12.6:1, both AAA. Don't go lighter than `#666` for text that carries meaning.

## 3. Typography

**Typeface:** [Inter](https://fonts.google.com/specimen/Inter), loaded at weights 300, 400, 500, 600, 700 **(measured)**. Fallback is `Inter, system-ui, -apple-system, "Segoe UI", sans-serif`.

Headings use weight **600** with **negative letter-spacing of about -6%** (`-0.06em`). Body text uses weight 400 with about -1% (`-0.01em`) tracking.

### Type scale (measured)

| Role | Size / Line height | Weight | Letter-spacing | Color |
|---|---|---|---|---|
| H1 (hero) | 72px / 76px | 600 | -4.32px (-0.06em) | `#0C0407` |
| H2 / section title | 36px / 43.2px | 600 | -1.08px (-0.03em) | `#0C0407` |
| H3 / CTA title, stat value | 24px / 28.8px | 600 | -1.44px (-0.06em) | `#0C0407` |
| Body large (hero sub, section intro) | 20px / 30px | 400 | -0.6px (-0.03em) | `#333` |
| Body base | 16px / 24px | 400 | -0.16px (-0.01em) | `#333` |
| Body small, nav, buttons, card text | 14px / 20px | 400 | -0.14px (-0.01em) | `#333` |

Notes:
- The site's section titles are marked up as H4 but styled at 36px. Use proper heading levels (H2) in our build and apply the style through classes.
- **(recommended)** Mobile scale: H1 44px / 48px, H2 28px / 34px, H3 20px / 24px. Keep the same tracking ratios.
- Headings are center-aligned in intro sections and left-aligned in the hero and feature rows.
- No uppercase text and no italics. The only decorative type is the script wordmark logo.
- Max line length for paragraphs: about 60 characters (the site constrains intro text to about 620px).

## 4. Layout and spacing

- **Container:** max-width **1241px**, with **20px** horizontal padding **(measured)**. Content width is therefore about 1201px.
- **Section rhythm:** **80px** margin between sections. The hero has **80px** bottom padding.
- **Section order (home page):**
  1. Floating navbar
  2. Hero (headline, subcopy, two CTAs, large product screenshot)
  3. "Why us" / audience cards (three tiers: Designer, Business, Enterprise)
  4. Features (alternating text + screenshot rows)
  5. CTA panel with stats
  6. Footer
- **Spacing scale (recommended, 4px base):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.
- Spacing seen in the site: 12px headline-to-text, 40px between a section header and its content, 48px padding inside the CTA panel, 48px gap between nav links.
- **Breakpoints (recommended):** 480, 768, 1024, 1280. Webflow-style collapse: nav becomes a hamburger below 768, cards stack to one column.

## 5. Shape, borders and elevation

### Border radius (measured)

| Element | Radius |
|---|---|
| Nav bar | 16px |
| Primary and secondary hero buttons | 12px |
| Small nav buttons (Log In, Sign Up) | 9.6px |
| CTA panel | 20px |
| Footer | 24px |

Use a consistent scale: **8 / 12 / 16 / 20 / 24**. Larger containers get larger radii.

### Borders

- Panels use a **1px (0.67px rendered) solid `#E4E4E4`**.
- Buttons have no border and rely on shadows instead.

### Shadows (measured, multi-layer)

| Token | Value | Use |
|---|---|---|
| `--shadow-nav` | `0 20px 32px -12px rgba(0,0,0,.08), 0 4px 6px rgba(0,0,0,.02), 0 2px 3px rgba(0,0,0,.03), 0 0 2px rgba(65,65,65,.08)` | Floating navbar |
| `--shadow-btn-white` | `1px 11px 11px rgba(0,0,0,.12), 0 3px 6px rgba(0,0,0,.14)` | White buttons |
| `--shadow-btn-black` | `4px 2px 17px rgba(0,0,0,.02), 2px 24px 24px rgba(0,0,0,.07), 1px 11px 11px rgba(0,0,0,.12), 0 3px 6px rgba(0,0,0,.14)` | Black primary button |
| `--shadow-btn-sm` | `4px 8px 17px rgba(0,0,0,.2), 0 3px 6px rgba(0,0,0,.14)` | Nav Log In / Sign Up buttons |

Shadows are stacked and soft, with a downward bias. Avoid single hard drop shadows.

## 6. Components

### Navbar
- Floating, centered pill/card: max-width **960px**, background `rgba(255,255,255,.95)`, radius 16px, `--shadow-nav`, 12px inner padding. It sits above the hero rather than being full-width.
- Left: logo (about 114px wide). Center: links (Designer, Business, Enterprise, Solutions with dropdown, Pricing, Articles), 14px / 400 / `#333`, about 48px gap. Right: Log In and Sign Up as small white buttons.
- Mobile: collapses to a menu with the buttons duplicated inside.

### Buttons
| Variant | Background | Text | Padding | Radius | Shadow |
|---|---|---|---|---|---|
| Primary (black) | `#0C0407` | white **(recommended: the site shows browser-blue text here, which is a bug)** | 10px 16px | 12px | `--shadow-btn-black` |
| Secondary (white) | `#FFFFFF` | `#000` | 10px 16px | 12px | `--shadow-btn-white` |
| Nav (small) | `#FFFFFF` | `#000` | 8px 12px | 9.6px | `--shadow-btn-sm` |

- 14px text, weight 400, with a small trailing arrow or icon (4px gap).
- **(recommended)** Hover: lift 1–2px (`translateY(-1px)`) and slightly deepen the shadow, 150ms ease. Focus: 2px `#4C6FFF` outline with 2px offset. Active: no lift.
- Hero pairs one primary and one secondary button side by side ("Start for free", "Book a demo").

### Hero
- Left: H1 (72px), 20px subcopy in `#333`, then two buttons. Right: large product screenshot in a rounded white frame with a soft shadow, partially bleeding off the edge.
- Background `#F5F5F5` with a repeating subtle **dot-grid pattern** image behind it, fading out toward the bottom.

### Audience cards ("A perfect fit for everyone")
- Three equal columns: Designer, Business, Enterprise. Each has a label, one sentence of 14px description, and a "Learn more" secondary button.
- Section heading is centered (36px) with a centered 20px intro paragraph, max about 620px wide.

### Feature rows
- Alternating text + screenshot layout (text 50% / image 50%, flipped each row).
- Each row: a small bold title, a short paragraph, and a screenshot (about 320px wide thumbnails or large frames) on a decorative **SVG pattern tile** background.
- Section heading: "The world's smartest 3D jewelry platform". **(Note: the live site misspells "platform" as "plaform". Don't copy typos.)**

### CTA panel with stats
- Container: background `#FAFAFA`, 1px `#E4E4E4` border, radius 20px, padding 48px (left and top), about 454px tall.
- Left column (about 480px): H3 title, a primary button.
- Right: a 2x2 stat grid. Value in 24px / 600, label in 14px `#666`. The live content is "100,000+ Designers", "5,000,000+ Customization options", "5 minutes to first design", "90% cheaper".

### Footer
- Rounded (24px) with a vertical gradient from transparent to light gray.
- Left: logo, one-line tagline ("The all-in-one jewelry design and sales platform."), 14px `#333`. Columns of links grouped by product area (Home, Design, Make, Sell, Pricing, Articles) and by use case. Social icons in `#808080`. A small copyright line.

## 7. Imagery and iconography

- **Product screenshots** in rounded frames (12–20px radius) on white or on pattern backgrounds. Never stock photography.
- **Patterns:** a fine dot grid (hero background) and a lighter SVG tile pattern behind feature screenshots. Keep them very low contrast (under 5% opacity against the background).
- **Icons:** simple outline arrows and chevrons at 14–16px. Use a single icon set (such as Lucide or Phosphor) at 1.5px stroke.
- **Logo:** the site uses a black script wordmark at about 114x54px. Aurix needs its own mark. Provide black on white, and reverse (white on black) versions.

## 8. Motion (recommended)

The site uses Webflow interactions. Keep ours subtle:
- Durations 150–250ms, easing `cubic-bezier(0.2, 0, 0, 1)`.
- Fade-up on scroll for sections (12px translate, 300ms), once only.
- Hover lift on buttons and cards. Dropdown fade and slide for the nav "Solutions" menu.
- Respect `prefers-reduced-motion`: disable translate animations.

## 9. Voice and content

- Short declarative headlines: "AI design and commerce platform", "Start designing now".
- Benefit-first subcopy, one sentence, concrete numbers (minutes, percentages, counts).
- Sentence case everywhere. No exclamation marks, no emoji.
- CTAs are verbs: "Start for free", "Book a demo", "Learn more".

## 10. Accessibility checklist

- Text contrast is at least 4.5:1 (body) and 3:1 (large text). Never use `#999` or lighter for essential text.
- Set explicit link, hover and focus styles. Don't rely on browser defaults.
- Every screenshot needs meaningful alt text. Pattern images are decorative (`alt=""`).
- Use one H1 per page and a logical H2/H3 hierarchy.
- All interactive elements are reachable by keyboard, with visible focus (`#4C6FFF` ring).
- Touch targets are at least 44x44px on mobile. The 8px-padding nav buttons are too small there, so pad them up.
- Honor `prefers-reduced-motion` and `prefers-color-scheme` (dark mode is not in the reference site, so treat it as optional).

## 11. Known quirks in the reference (don't copy)

- Unstyled links render in default browser blue (`#0000EE`), including the "Start for free" button text.
- Section titles use H4 elements and the body font falls back to Arial.
- Typo "plaform" in the features heading.
- Duplicate nav labels in the DOM (desktop and mobile copies).
