---
version: alpha
name: INNLAB IRL Diagnostic
description: >
  Visual identity for the IRL Diagnostic System — a maturity assessment tool
  built at INNLAB, Centro de Innovación de la Universidad Icesi, for leaders
  of digital innovation initiatives. Aligned with the Icesi institutional
  brand manual (Febrero 2026): Azul Icesi primary palette, Plus Jakarta Sans
  typography, descriptor lock-up rules for INNLAB as a "centro" under the
  university's brand architecture.

colors:
  # === Icesi institutional primary palette ===
  # From the Icesi brand manual (Febrero 2026). DO NOT alter these hex values.
  azul-icesi: "#5454E9"           # Pantone 2131 C — primary brand color
  blanco: "#FFFFFF"

  # === Icesi institutional complementary palette ===
  # From the brand manual. Used as accents only, never as primary text.
  # Note: per the manual, complementary colors NEVER appear independently
  # from the primary palette; they support it.
  verde-icesi: "#4CB979"          # Pantone 2251 C
  amarillo-icesi: "#E4EB60"       # Pantone 381 C
  morado-icesi: "#865CF0"         # Pantone 2665 C
  naranja-icesi: "#E9683B"        # Pantone Orange 21 C
  gris-1: "#88898C"               # Pantone 423 C — separator line per brand manual
  gris-2: "#CECFD4"               # Pantone 420 C — soft dividers, disabled
  negro: "#000000"

  # === Functional tokens derived from the Icesi palette ===
  # Built by darkening official complementary hues until each pair passes WCAG AA.
  # Each functional token retains the hue family of its Icesi source.

  # Primary (the action / focus color)
  primary: "#5454E9"              # Azul Icesi — identity anchor
  primary-hover: "#3F3FCC"
  primary-pressed: "#2E2EAA"
  on-primary: "#FFFFFF"

  # Accent (CTA — derived by darkening Naranja Icesi for AA compliance)
  accent: "#A24317"
  accent-hover: "#8C3811"
  accent-pressed: "#7A300C"
  on-accent: "#FFFFFF"

  # Surfaces
  background: "#FFFFFF"           # Per Icesi brand: positive logo applies on white ONLY
  surface: "#FFFFFF"
  surface-muted: "#F5F5FA"        # Subtle wash for section backgrounds; tinted toward Azul Icesi
  surface-emphasis: "#EFEFFB"     # Light wash of azul-icesi for callouts

  # Text
  text-primary: "#1A1A24"         # Near-black with a faint blue tint, mirrors Azul Icesi family
  text-secondary: "#4A4A55"
  text-tertiary: "#88898C"        # Equal to Gris 1 — official Icesi neutral
  text-on-dark: "#FFFFFF"

  # Borders
  border: "#CECFD4"               # Equal to Gris 2 — official Icesi neutral
  border-strong: "#88898C"        # Equal to Gris 1 — for inputs and emphasis dividers
  separator-vertical: "#88898C"   # Gris 1, used in descriptor lock-up per brand manual

  # Focus ring — must be visible and brand-aligned
  focus-ring: "#5454E9"           # Azul Icesi

  # === Semantic colors (bound to IRL imbalance classifications) ===
  # Derived from Icesi complementary palette, darkened to pass AA.
  critical: "#A53221"
  critical-bg: "#FBEDEA"
  on-critical: "#FFFFFF"

  moderate: "#8C3811"             # darkened Naranja Icesi
  moderate-bg: "#FBEDE5"
  on-moderate: "#FFFFFF"

  acceptable: "#1F633D"           # darkened Verde Icesi
  acceptable-bg: "#E5F2EB"
  on-acceptable: "#FFFFFF"

  info: "#5454E9"                 # Azul Icesi
  info-bg: "#EFEFFB"

  # === IRL dimension colors ===
  # Six hues, all passing AA on white. TRL anchors to Azul Icesi.
  dimension-trl: "#5454E9"        # Azul Icesi — anchor
  dimension-crl: "#5832B0"        # Darkened Morado Icesi — "looking outward"
  dimension-brl: "#1F633D"        # Darkened Verde Icesi — strategic growth
  dimension-iprl: "#3D3D5C"       # Cool dark slate — formal/legal
  dimension-tmrl: "#8C3811"       # Darkened Naranja Icesi — human warmth
  dimension-frl: "#5C4A1A"        # Darkened Amarillo Icesi — material/concrete

typography:
  # Plus Jakarta Sans is the mandated institutional typeface
  # (Manual de identidad de marca Icesi, Febrero 2026 — sección "Tipografía").
  # Source: https://www.icesi.edu.co/wp-content/uploads/2024/11/PlusJakartaSans.zip
  display:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 3rem
    lineHeight: 1.1
    fontWeight: 700
    letterSpacing: -0.02em
  h1:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 2.25rem
    lineHeight: 1.2
    fontWeight: 700
    letterSpacing: -0.015em
  h2:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 1.75rem
    lineHeight: 1.25
    fontWeight: 700
    letterSpacing: -0.01em
  h3:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 1.375rem
    lineHeight: 1.3
    fontWeight: 600
  h4:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 1.125rem
    lineHeight: 1.35
    fontWeight: 600
  body-lg:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 1.125rem
    lineHeight: 1.6
    fontWeight: 400
  body-md:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 1rem
    lineHeight: 1.55
    fontWeight: 400
  body-sm:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 0.875rem
    lineHeight: 1.5
    fontWeight: 400
  label:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 0.875rem
    lineHeight: 1.4
    fontWeight: 500
  button:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 0.9375rem
    lineHeight: 1.2
    fontWeight: 600
    letterSpacing: 0.005em
  caption:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 0.75rem
    lineHeight: 1.4
    fontWeight: 400
    letterSpacing: 0.005em
  overline:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: 0.6875rem
    lineHeight: 1.3
    fontWeight: 600
    letterSpacing: 0.08em
  fallback:
    fontFamily: 'Arial, sans-serif'
    fontSize: 1rem
    lineHeight: 1.55
    fontWeight: 400

rounded:
  none: 0
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  px: 1px
  0.5: 2px
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
  20: 80px

elevation:
  none: "none"
  sm: "0 1px 2px 0 rgba(26, 26, 36, 0.04)"
  md: "0 2px 6px -1px rgba(26, 26, 36, 0.06), 0 1px 3px -1px rgba(26, 26, 36, 0.04)"
  lg: "0 8px 24px -4px rgba(26, 26, 36, 0.08), 0 4px 8px -2px rgba(26, 26, 36, 0.04)"
  xl: "0 16px 40px -8px rgba(26, 26, 36, 0.10), 0 8px 16px -4px rgba(26, 26, 36, 0.06)"

components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 20px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-pressed:
    backgroundColor: "{colors.accent-pressed}"

  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 20px
    height: 40px
  button-secondary-hover:
    backgroundColor: "{colors.surface-emphasis}"

  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 16px
    height: 40px
  button-ghost-hover:
    backgroundColor: "{colors.surface-muted}"

  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 24px
  statement-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: 20px

  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 10px 12px
    height: 40px

  likert-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    size: 40px
  likert-option-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"

  tab-trigger:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 12px 16px
  tab-trigger-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"

  imbalance-critical:
    backgroundColor: "{colors.critical-bg}"
    textColor: "{colors.critical}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  imbalance-moderate:
    backgroundColor: "{colors.moderate-bg}"
    textColor: "{colors.moderate}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  imbalance-acceptable:
    backgroundColor: "{colors.acceptable-bg}"
    textColor: "{colors.acceptable}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 16px

  brand-descriptor:
    textColor: "{colors.azul-icesi}"
    typography: "{typography.label}"
  brand-descriptor-separator:
    backgroundColor: "{colors.gris-1}"
    width: 1px
---

## Overview

The IRL Diagnostic System is an internal product of **INNLAB**, the innovation center of **Universidad Icesi**. INNLAB falls under the university's brand architecture as a **centro** (Centro de Innovación) — per the institutional manual, centros do not have their own logo, do not invent their own palette, and use a controlled descriptor lock-up when they appear publicly. This document inherits the Icesi visual identity and adapts it for a software UI.

The product's character is **academic-modern and institutional**: a clean white canvas, Azul Icesi as the identity anchor, Plus Jakarta Sans as the only typeface, restrained color, generous spacing. It feels like a contemporary research dashboard — not a startup landing page, not a consumer app. The user being assessed is a leader of an innovation initiative; the UI must respect that.

### Sources of truth

This DESIGN.md is derived from three authoritative sources, in priority order:

1. **Manual de identidad de marca Icesi, Febrero 2026** — the institutional brand manual. Available at: <https://www.icesi.edu.co/wp-content/uploads/2026/03/Manual-de-marca-institucional-Icesi.pdf>. **This document overrides anything else when it speaks**: Azul Icesi (`#5454E9`), Plus Jakarta Sans, complementary palette, descriptor rules for centros.
2. **Icesi Imagen Institucional** — the assets and downloads index. <https://www.icesi.edu.co/imagen-institucional/>. Direct download of Plus Jakarta Sans is provided there.
3. **INNLAB Centro de Innovación** — <https://innlab.org/> and the Icesi sub-site. INNLAB has no independent identity; it inherits from the parent brand.

When a design decision needs to be made, the order of authority is: brand manual → this DESIGN.md → team consensus. If a Tailwind utility or shadcn primitive can't express a brand rule, the rule wins and the implementation has to adapt.

### Voice and tone

- The product reads in **Spanish (es-CO)**.
- Direct, in second-person singular (`Selecciona tu nivel de acuerdo`, not `Por favor, selecciona...`).
- No exclamation marks except for the rare genuine warning (`¡Atención!`).
- No emoji in product copy.
- The institutional tagline **"Llega más lejos"** is **NOT** used inside this product. Per the manual, the tagline is reserved for institutional positioning pieces, marketing campaigns, and admissions material — never for internal tools.
- The mascot **"Andy"** is **NOT** used inside this product. Per the manual, Andy and the supporting characters are reserved for events of general community interest.
- IRL acronyms (TRL, CRL, BRL, IPRL, TmRL, FRL) are never lowercased, never translated, never abbreviated further.

## Colors

### Institutional primary palette (Icesi)

These hex values come directly from the brand manual. They are **non-negotiable** and may not be retuned even if a contrast check argues otherwise.

| Token          | Hex       | Pantone | Usage in this product                                                                                                                                                                          |
| -------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Azul Icesi** | `#5454E9` | 2131 C  | Identity anchor. Used for the descriptor, the focus ring, the selected Likert option, the TRL dimension, all section headers when colored, primary buttons in their secondary outline variant. |
| **Blanco**     | `#FFFFFF` | —       | The page background and card surface. **No off-white tint** — the Icesi positive lockup applies on pure white only.                                                                            |

### Institutional complementary palette (Icesi)

Used **as accents only, never independently of the primary palette** (manual: "La paleta complementaria funciona como apoyo a la principal y nunca se aplica de manera independiente a ésta"). Available for graphic blocks, section dividers, illustration:

| Token          | Hex       | Pantone         |
| -------------- | --------- | --------------- |
| Verde Icesi    | `#4CB979` | 2251 C          |
| Amarillo Icesi | `#E4EB60` | 381 C           |
| Morado Icesi   | `#865CF0` | 2665 C          |
| Naranja Icesi  | `#E9683B` | Orange 21 C     |
| Gris 1         | `#88898C` | 423 C           |
| Gris 2         | `#CECFD4` | 420 C           |
| Negro          | `#000000` | Process Black C |

### Why the functional palette diverges from the raw Icesi accents

Several Icesi accent colors **fail WCAG AA when used as text** because they were designed for print and large-format display, not for 16px body type on a screen:

| Icesi accent             | Contrast on white | AA body (4.5:1) |
| ------------------------ | ----------------- | --------------- |
| Verde Icesi `#4CB979`    | 2.46:1            | ✗               |
| Amarillo Icesi `#E4EB60` | 1.28:1            | ✗               |
| Naranja Icesi `#E9683B`  | 3.23:1            | ✗               |
| Morado Icesi `#865CF0`   | 4.37:1            | ✗ (marginal)    |
| Azul Icesi `#5454E9`     | 5.49:1            | ✓               |

For text and interactive states the system uses **darkened variants of the Icesi hues** that preserve the family identity while passing AA. Used as solid block fills (per the manual's "diagramación con bloques de color"), the original Icesi accent colors are fine — that pattern just doesn't apply to body text in a software UI.

### Functional / semantic palette

Bound to the IRL imbalance classifications from SRS (`SA-06` / `RF-10`):

- **Critical (`#A53221`)** — Imbalance difference > 3. A brick red, **not** from the Icesi palette: the brand has no red, and emergency signaling needs hue separation from the naranja and warning families.
- **Moderate (`#8C3811`)** — Darkened Naranja Icesi. Imbalance 2–3. Preserves the Naranja Icesi family for institutional consistency while reaching AA contrast.
- **Acceptable (`#1F633D`)** — Darkened Verde Icesi. Imbalance < 2. Same logic.
- **Info (`#5454E9`)** — Azul Icesi itself, no darkening needed.

Each semantic color has a paired `*-bg` token (very light wash of the same hue) for use as backgrounds of callouts and chips. Never use the strong color as a background and the `-bg` as text — only the inverse.

### IRL dimension palette — six hues, AA-compliant

| Dimension                        | Code | Hex       | Source                                                          |
| -------------------------------- | ---- | --------- | --------------------------------------------------------------- |
| Madurez Tecnológica              | TRL  | `#5454E9` | Azul Icesi (anchor)                                             |
| Madurez de Cliente               | CRL  | `#5832B0` | Darkened Morado Icesi                                           |
| Madurez de Negocio               | BRL  | `#1F633D` | Darkened Verde Icesi                                            |
| Madurez de Propiedad Intelectual | IPRL | `#3D3D5C` | Cool slate (not in Icesi palette, used for category separation) |
| Madurez de Equipo                | TmRL | `#8C3811` | Darkened Naranja Icesi                                          |
| Madurez de Financiación          | FRL  | `#5C4A1A` | Darkened Amarillo Icesi                                         |

These colors appear in **three places only**: radar-chart axis labels, the per-dimension result card border accent, and the dimension chip / overline. They do **not** appear in form inputs — answering a TRL statement should not look different from answering an FRL statement.

### Accessibility floor

Every text-on-surface combination used for active content meets WCAG AA (4.5:1 body, 3:1 large text). Every interactive component meets the AA non-text contrast minimum (3:1) against its surrounding fill. Color is never the sole carrier of information — semantic states pair color with an icon (`AlertCircle` for critical, `AlertTriangle` for moderate, `CheckCircle` for acceptable) and a text label.

**Honest exceptions:**

- `text-tertiary` (`#88898C`, Gris 1 from the manual) sits at 3.5:1 on white — below the 4.5 threshold. It is used only for placeholder text, disabled controls, and helper captions on optional inputs. WCAG 1.4.3 expressly exempts inactive UI components from contrast minimums. Never use `text-tertiary` for content the user must read to operate the system.
- The default `border` (`#CECFD4`, Gris 2 from the manual) at 1.56:1 is purely decorative (hairline dividers). WCAG does not require contrast for purely decorative dividers. State-bearing borders use `border-strong` (Gris 1, 3.5:1) or `primary` (Azul Icesi, 5.49:1).

Numeric AA verification of every text-on-fill pair runs as a `lint` step in CI (`npx @google/design.md lint DESIGN.md`).

## Typography

### Plus Jakarta Sans — the only typeface

Per the institutional brand manual: **"La tipografía principal Plus Jakarta Sans, se acopla muy bien a la identidad de la marca."** Used for *all* text in the product — headers, body, labels, buttons, captions, the radar-chart axis labels. There is no serif companion; Icesi has chosen Plus Jakarta Sans as a single workhorse face, and that decision propagates.

Weights in use: ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold (the manual ships them all). The product uses Regular (400), Medium (500), SemiBold (600), and Bold (700). Italics are reserved for the cases the RAE recognizes (foreign-language terms, Latin locutions) — they are **not** used for emphasis in UI copy.

**Self-host the font.** Download Plus Jakarta Sans from the institutional source: <https://www.icesi.edu.co/wp-content/uploads/2024/11/PlusJakartaSans.zip>. Ship it from your own CDN under `apps/web/public/fonts/`. The license is permissive but the Icesi version is the canonical drop — use that.

**Fallback face**: Arial. The manual designates Arial for internal documents generated in Microsoft Office. In the SPA, it is the `font-family` fallback chain entry, never the primary intent.

### Type scale

| Token      | Size | Weight                      | Context                                                 |
| ---------- | ---- | --------------------------- | ------------------------------------------------------- |
| `display`  | 48px | 700                         | Reserved for the home/landing hero; not used in phase 1 |
| `h1`       | 36px | 700                         | Page title                                              |
| `h2`       | 28px | 700                         | Section heading                                         |
| `h3`       | 22px | 600                         | Subsection / card title                                 |
| `h4`       | 18px | 600                         | Statement-card secondary header (e.g. dimension name)   |
| `body-lg`  | 18px | 400                         | Statement text — calibrated for comfort across 48 reads |
| `body-md`  | 16px | 400                         | Default UI body                                         |
| `body-sm`  | 14px | 400                         | Captions, table cells, secondary copy                   |
| `label`    | 14px | 500                         | Form labels                                             |
| `button`   | 15px | 600                         | All button text                                         |
| `caption`  | 12px | 400                         | Helper text, metadata                                   |
| `overline` | 11px | 600, 8% tracking, UPPERCASE | Dimension codes (TRL, CRL, ...), eyebrow labels         |

### Specific calls

- **Statement text** uses `body-lg` (18px). At a 700-px content width that's ~60 chars per line, the readability sweet spot. Don't shrink statement text to fit more on screen; pagination via dimension tabs is the right tradeoff.
- **IRL dimension codes (TRL, CRL, ...)** always use `overline`: uppercase, 8% letter spacing. The manual's "Usos incorrectos" forbids "mayúscula sostenida" for headings ("Titulares de no más de tres palabras") — but acronyms are a permitted exception and always uppercase.
- **The KTH attribution footer** uses `caption`. Required on every results view per RNF-09: `Marco IRL © KTH Innovation. Licencia CC BY-NC-SA 4.0.`
- **Text alignment** follows the brand manual: align-left by default. Centered alignment is used only for short, highlighted information ("Solo se pueden alinear textos al centro para destacar información breve"). Never align right. Never use bottom-tight line-height ("interlineado muy cerrado" is in the "Usos incorrectos" list).

## Layout

### Container widths

- **Reading-width container (`max-w-3xl`, ~768px)** — questionnaire and text-heavy views. Forces ~60-char lines.
- **Standard container (`max-w-5xl`, ~1024px)** — maturity profile (radar + dimension grid). Not in scope for phase 1.
- **Dashboard container (`max-w-7xl`, ~1280px)** — diagnostic list / home view.

### Spacing rhythm (4-point grid)

- Inside components: `2`, `3`, `4` (8/12/16px).
- Between related components within a section: `4`, `5`, `6` (16/20/24px).
- Between sections: `8`, `10`, `12` (32/40/48px).
- Page top/bottom padding: `12`, `16` (48/64px).

Never one-off pixel values. If the scale doesn't have what you need, the design is wrong, not the scale.

### Grid (Icesi-compatible)

The Icesi brand manual specifies a retícula derived by dividing the shorter side of any format into 16 squares and replicating across the long side. The SPA uses a Tailwind 12-column grid which is grid-compatible (12 and 16 share clean divisors at 1, 2, 3, 4, 6, 12) — when laying out marketing-like surfaces, place container edges on the 16-square gridlines.

Responsive breakpoints:
- 1 column on mobile (radar chart full width, dimension cards stacked).
- 2 columns on tablet (radar on left, 3×2 dimension cards on right).
- 12 columns on desktop (radar takes 7, dimension cards take 5).

## Elevation & Depth

Shadows are restrained. The system is flat-ish by default; elevation is reserved for clearly floating elements.

- `elevation.sm` — Default for `card`.
- `elevation.md` — Active tabs, dropdown triggers.
- `elevation.lg` — Modal dialogs, toast notifications.
- `elevation.xl` — Reserved; unused in phase 1.

Borders are the primary depth signal, not shadows. A 1px hairline costs no rendering and reads cleanly at every zoom — important for low-DPI projector screens during INNLAB workshops.

## Shapes

Rounded corners are present but not dominant. The system favors **`rounded.md` (8px)** as the default.

| Radius | Token          | Used for                                                     |
| ------ | -------------- | ------------------------------------------------------------ |
| 4px    | `rounded.sm`   | Inputs, small chips, dimension tabs (tighter = more precise) |
| 8px    | `rounded.md`   | Cards, buttons, statement cards (the default)                |
| 12px   | `rounded.lg`   | Larger surfaces (modals, hero panels — none in phase 1)      |
| 9999px | `rounded.full` | Likert option circles, dimension chips                       |

Square corners (`rounded.none`) appear only in radar-chart axes. Never on clickable surfaces.

### Iconography rules (from the Icesi manual)

The institutional manual specifies:

- **Esquinas angulares** (angular corners on icon construction)
- **Terminaciones rectas** (straight stroke terminations)
- **Grosor de línea uniforme** (uniform stroke weight)

Lucide-react icons (the default for shadcn/ui) use rounded line joins and rounded caps by default, which contradicts the institutional spec. The fix is straightforward: override Lucide's stroke joins via CSS or via the `Icon` component's `linejoin`/`linecap` props.

In phase 1, apply a global CSS override on every Lucide SVG:

```css
.lucide,
[data-lucide] {
  stroke-linejoin: miter;
  stroke-linecap: butt;
}
```

Stroke width 1.5px–2px, uniform. Never below 1px or above 2.5px.

## Components

### Brand descriptor (institutional lock-up)

The Icesi manual requires that any centro participating in external communication uses a **descriptor lock-up**: the Icesi horizontal logotype, a thin Gris 1 vertical separator line, and the centro descriptor in **Plus Jakarta Sans Medium, color Azul Icesi**. For INNLAB the descriptor reads:

```
[ Icesi logotype ] | INNLAB Centro de Innovación
```

In this product the descriptor appears in the top-left of every page header. The vertical separator is a 1px `gris-1` line whose height is 30% of the logotype height per the manual. The centro siglas ("INNLAB") sit to the left of the separator in `overline` style (uppercase, 8% tracking); the full name ("Centro de Innovación") follows in `label` style.

Do **not** invent a standalone INNLAB logo. Do **not** stylize the descriptor. Do **not** change the separator color or thickness. The manual's "Centros y observatorios — Construcción del descriptor" is explicit on every detail.

### Buttons

Three intents, one default size.

- **`button-primary`** — Filled with `accent` (the darkened-naranja CTA). White text. Used for the single action that completes the user's task on a screen. Examples: "Procesar diagnóstico," "Continuar al cuestionario."
- **`button-secondary`** — White surface with `primary` (Azul Icesi) text and a 1px Azul Icesi border. The institutional companion to a filled primary — same conceptual weight, lower visual energy.
- **`button-ghost`** — Transparent until hover. For low-emphasis actions inside a card or table.

There is no destructive variant in phase 1; nothing is destroyed.

### Statement card

The single most important component in phase 1. Each of the 48 cards holds:

1. An overline showing dimension + sequence (`TRL · 3 de 8`).
2. The statement text in `body-lg`.
3. The Likert scale (5 circular options).

Card padding `20px`. Statement text wraps at ~60 characters. The Likert row uses `gap-3` (12px) between options.

### Likert scale option

A 40px circle, `rounded.full`. **Unselected**: surface fill, secondary text, 2px `border-strong` (Gris 1). **Selected**: `primary` (Azul Icesi) fill, white text, ring in Azul Icesi at 30% alpha extending 4px out. The selection signal is **three concurrent changes**: fill, text color, ring. Color alone is never the cue.

Layout: five options in a row, centered, numeric labels (1–5) inside each circle. Below each circle, in `caption`, the Spanish scale meaning is rendered with `class="sr-only"` so screen readers announce both the number and the textual meaning while sighted users see just the numbers.

### Dimension tabs

A `Tabs.List` rendered as a 6-column grid on desktop, scroll-snapping horizontal row on mobile. Each `TabsTrigger`:

- Dimension code (TRL, CRL, ...) in `overline`.
- Optional per-dimension progress badge (`3/8`) in `caption` — `[VERIFY]` if in scope per Story 2.

Active tab: surface fill, Azul Icesi text, `elevation.md`. Inactive: transparent, secondary text.

### Radar chart

Single shape, single fill: Azul Icesi at 20% alpha with a 2px stroke at full Azul Icesi. Six axes labeled with dimension codes in `overline`, colored by their `dimension-*` token. Domain 1–9.

Includes `<title>` and `<desc>` for screen readers: `"Madurez Tecnológica: nivel 5 de 9. Madurez de Cliente: nivel 3 de 9. ..."`.

### Imbalance indicator

Three variants — critical, moderate, acceptable. Each combines:

- An icon at left (Lucide outlined, 20px, in the semantic color, `stroke-linejoin: miter` per manual).
- A `body-sm` text label in the semantic color, slightly bolder.
- Surface fill in the matching `*-bg` token.

Sort order on the profile: critical first, moderate next, acceptable collapsed under a `"3 pares en rango aceptable"` summary that expands on click.

### Form input

40px height, `rounded.sm`, 1px `border-strong` (Gris 1) border. Focus: 2px Azul Icesi outline at 2px offset. Error: 1px critical border, `caption` error message in critical with `AlertCircle` icon. Never `outline: none` without an alternative focus indicator.

## Do's and Don'ts

### Do

- **Do** use Plus Jakarta Sans for everything. It is the only typeface.
- **Do** use Azul Icesi `#5454E9` as the identity anchor. It must be visible somewhere on every screen.
- **Do** apply the INNLAB descriptor in the page header per the institutional lock-up rules.
- **Do** keep the page background pure white. The Icesi positive logotype is licensed for use on white only.
- **Do** pair every semantic color with an icon and a text label. Color is never the only signal.
- **Do** align text to the left. Center alignment is reserved for short, highlighted information per the manual.
- **Do** include the KTH framework attribution on every results view (RNF-09).
- **Do** prefer borders (Gris 1, Gris 2) over shadows for depth.

### Don't

- **Don't** invent an INNLAB logo. INNLAB is a centro and per the institutional brand architecture does not have its own logotype or symbol.
- **Don't** use the Icesi tagline "Llega más lejos" in the product. The manual reserves it for institutional positioning and admissions material.
- **Don't** use the mascot Andy or supporting characters. They are reserved for events of general community interest.
- **Don't** use Icesi complementary colors as text on white. Verde, Amarillo, Naranja, and Morado Icesi all fail WCAG AA at body sizes. Use the darkened functional variants instead.
- **Don't** apply complementary colors independently of the primary palette — the manual is explicit ("nunca se aplica de manera independiente").
- **Don't** introduce a second typeface. The institutional manual mandates Plus Jakarta Sans; Arial is the fallback for Office documents only.
- **Don't** use italics for emphasis. Per the manual, italics are restricted to foreign-language terms and Latin locutions.
- **Don't** use mayúscula sostenida (all-caps) for paragraphs, only for short labels of three words or less.
- **Don't** justify text or align right; default to left-aligned per the manual.
- **Don't** add gradients, background images, or decorative illustration. The system is flat and disciplined.
- **Don't** stylize Lucide icons with rounded joins; override with `stroke-linejoin: miter` to match the institutional iconography rules.
- **Don't** color form inputs by dimension. Answering a TRL statement is mechanically identical to answering an FRL statement.
- **Don't** add a logo lockup or watermark to the radar chart. The chart is the data; chrome distracts from the data.
- **Don't** modify the descriptor lock-up. Don't recolor the separator, don't change the typeface, don't reverse the order. The brand manual is explicit on all of this.