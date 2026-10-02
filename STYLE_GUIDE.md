# c3nsor style guide

Brand tokens for the c3nsor landing page. Source of truth in code: `docs/styles.css`, `docs/theme.css`, `docs/layout.css`.

Visual reference: [docs/style-guide.html](docs/style-guide.html) (also on GitHub Pages as `/IS-581/style-guide.html`).

---

## Personality

Editorial, high-contrast, and quiet. Black and gray carry the page; red is a rare signal, not decoration. Tight letter-spacing and large Manrope headlines do the brand work — not purple gradients, cream paper, or soft “AI product” defaults.

---

## Color

### Core palette

| Token | Hex | Role |
| --- | --- | --- |
| Ink | `#101010` | Primary surface (hero, header), primary text on light, CTA fill |
| Paper | `#ffffff` | Page background on light sections, light buttons, cards |
| Line | `#d0d0d0` | Dividers, subtle borders |
| Muted | `#6d6d6d` | Secondary body text on light backgrounds |
| Accent | `#b42318` | Brand signal (sparingly: dots, emphasis) |

CSS variables (from `docs/styles.css` + `docs/theme.css`):

```css
:root {
  --ink: #101010;
  --paper: #fff;
  --line: #d0d0d0;
  --muted: #6d6d6d;
  --accent: #b42318;
}
```

### Supporting grays (dark UI)

| Hex | Use |
| --- | --- |
| `#343434` | Header bottom border |
| `#a6a6a6` | Kickers, labels on dark |
| `#d0d0d0` | Hero supporting copy, CTA notes |
| `#c4c4c4` | Thank-you body copy |
| `#dddddd` | Nav links on dark |

### Supporting grays (light UI)

| Hex | Use |
| --- | --- |
| `#ececec` / `#e8e8e8` | Soft section / demo chrome backgrounds |
| `#f3f3f3` / `#f5f5f7` / `#f7f7f7` | Soft surfaces |
| `#2a2a2a` / `#1d1d1f` | Soft ink on light chrome (demo) |
| `#cfcfcf` / `#c3c3c3` | Hairline chrome borders |

### Do / don’t

- **Do** lead with ink + paper. Keep large areas black or white/light gray.
- **Do** use accent only for small signals or true emphasis.
- **Don’t** introduce purple, indigo, teal, or warm cream as brand colors.
- **Don’t** rely on glow, neon, or multi-layer colored shadows for brand identity.

Product-demo colors (Facebook blue `#1877f2`, macOS traffic lights, etc.) are **mock-only** and not part of the c3nsor brand palette.

---

## Typography

### Families

| Family | Weights | Role |
| --- | --- | --- |
| **Manrope** | 400, 500, 600, 700, 800 | Brand name, headlines, body, buttons |
| **DM Mono** | 400, 500 | Kickers, brand mark, meta labels, CTA notes |

Load from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Fallback stacks:

- UI / display: `Manrope, Arial, sans-serif`
- Mono: `"DM Mono", monospace`

### Type scale (landing)

| Role | Spec |
| --- | --- |
| Hero brand (`c3nsor`) | Manrope 800, `clamp(52px, 7.2vw, 84px)`, line-height `.88`, letter-spacing `-0.07em` |
| Hero / section H1–H2 | Manrope 600, large fluid size (`clamp` ~48–128px), letter-spacing about `-0.075em`, tight line-height |
| Feature H3 | Manrope ~28–40px (fluid), letter-spacing about `-0.04em` to `-0.05em` |
| Body / hero copy | Manrope 400, ~16–17px, line-height ~1.6–1.65 |
| Buttons / CTA | Manrope 600, 14–17px, letter-spacing `-0.02em` |
| Brand wordmark (header) | Manrope 800, ~18–22px, letter-spacing `-0.045em` |
| Brand mark (`c3` box) | DM Mono 400–500, ~14–16px |
| Kicker | DM Mono 500, 11px, letter-spacing `0.16em`, uppercase feel |
| Meta / CTA note | DM Mono 400, 11–13px |

### Brand wordmark

- Spell **c3nsor** in lowercase Manrope ExtraBold.
- The digit **3** stays the same weight as surrounding letters (no decorative alternate).
- Pair with the boxed **c3** mark in DM Mono when space allows (header / footer).

### Do / don’t

- **Do** keep headlines heavy and tightly tracked.
- **Do** reserve DM Mono for labels, kickers, and technical chrome — not long paragraphs.
- **Don’t** swap Manrope for Inter, Roboto, system UI, or a display serif on marketing headlines (layout.css serif fallback is overridden by theme).
- **Don’t** mix in a third brand font.

---

## Components (color + type)

| Element | Background | Text | Type |
| --- | --- | --- | --- |
| Header / hero / access | `#101010` | `#ffffff` / gray support | Manrope + DM Mono kickers |
| Light feature sections | `#ffffff` or soft gray | `#101010` | Manrope |
| Primary CTA (hero) | `#ffffff` | `#101010` | Manrope 600 |
| Form submit | `#101010` | `#ffffff` | Manrope 600 |
| Form input | transparent | `#101010` | Manrope; bottom border `2px solid #101010` |

---

## Motion & atmosphere (brief)

Page atmosphere comes from ink/paper contrast, fluid type, and restrained gradients — not colored glassmorphism. Prefer subtle fades between black and gray over decorative patterns.

---

## File map

| File | Responsibility |
| --- | --- |
| `docs/styles.css` | Base tokens (`--ink`, `--paper`, …), base layout |
| `docs/theme.css` | Brand overrides, accent, demo chrome, editorial type |
| `docs/layout.css` | Grid, spacing, section structure |
| `docs/style-guide.html` | Visual swatches and type specimens |
