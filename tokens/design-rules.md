# Design Rules

- Use auto layout for every section and child grouping; avoid absolute positioning.
- Desktop viewport is 1920px with a 1200px content container; mobile viewport is 420px.
- Columns:
  - Desktop sections prefer 3 columns, but may expand to 4–5 when necessary.
  - Mobile layouts allow 1–2 columns.
- Section padding must be 24–40px and use even integers.
- Item spacing must use even values between 8–24px.
- Radii tokens: `sm` 4px, `md` 8px, `lg` 12px, `xl` 16px.
- Typography tokens: `h1` 36px, `h2` 28px, `h3` 22px, `body` 16px, `small` 14px.
- Prefer Material 3 components via `componentKey`; fallback to primitives if unavailable.
- Load Inter/Roboto font families before text creation.
- Clamp generated values to the closest token defined in `design-tokens.json`.
