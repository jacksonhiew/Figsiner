# Figsiner

Figsiner is a Figma plugin that generates and edits sections using AI. It leverages OpenAI-compatible models and a published Material 3 Figma library (or primitives as fallback) to create **production-grade** components section by section.

---

## ✨ Features
- **Section generation**  
  Generate one section at a time (Hero, Features, Pricing, FAQ, etc.) directly into a selected frame.

- **Section editing (patch-only)**  
  Select an existing section, describe your change in natural language, and Figsiner applies edits with patch ops.

- **Dual viewport output**  
  AI returns **desktop (1920 width, 1200 container)** and **mobile (420 width)** layouts at once.

- **Component reuse**  
  Prefers Material 3 components via `componentKey`. Falls back to wireframe primitives if not available.

- **Design tokens & rules**  
  Enforces spacing, radii, typography, and layout rules for consistent design.

---

## 📦 Repo Structure
\`\`\`
Figsiner/
  manifest.json
  src/
    plugin.ts
    ui.html
    ui.ts
    renderer/
      render-section.ts
      component-instance.ts
      primitive-builders.ts
      patch-applier.ts
    schemas/
      section.schema.json
      section.patch.schema.json
  prompts/
    section-generate.txt
    section-edit.txt
  tokens/
    design-tokens.json
    design-rules.md
  catalog/
    component-catalog.json
  docs/
    plan/
      phase1-section-engine.md
      checklist.md
  ops/
    checklist.yaml
  tools/
    export-keys-dev-plugin/
  vite.config.ts
  package.json
  README.md
\`\`\`

---

## ⚙️ Setup

### 1. Install
- Clone this repo  
- Run \`npm install\` or \`yarn\`

### 2. Build
- Run \`npm run build\` or \`yarn build\`  
- Outputs go to \`dist/plugin.js\` and \`dist/ui.html\`

### 3. Load in Figma
- Open Figma Desktop → Plugins → Development → Import plugin from manifest…  
- Select \`manifest.json\` from this repo.

---

## 🔑 Usage

1. **Set API host and key**  
   - Open plugin → Settings → Enter OpenAI-compatible API host (e.g., \`https://example.com/v1\`) and API key.  
   - Press **Verify** (calls \`/models\`).  
   - Saved locally via \`clientStorage\`.

2. **Generate a section**  
   - Select an empty frame (or none, to auto-create one).  
   - Enter prompt (e.g., “Hero section with headline, subheadline, and signup button”).  
   - AI outputs **desktop + mobile** variants.

3. **Edit a section**  
   - Select an existing section frame.  
   - Enter prompt (e.g., “Change to 3 columns” or “Update button text to ‘Subscribe Now’”).  
   - AI applies patch ops.

---

## 📐 Design Rules
- Auto Layout only  
- Section padding: 24–40 (tokens)  
- Item spacing: 8–24 (tokens)  
- Columns: mobile 1–2, desktop 3–5  
- Even spacing integers (no decimals)  
- Radii: sm=4, md=8, lg=12, xl=16  
- Text scale: h1=36, h2=28, h3=22, body=16, small=14  

---

## 📚 Development Plan
See [docs/plan/phase1-section-engine.md](docs/plan/phase1-section-engine.md) for full checklist and architecture.

---

## 🚨 Error Handling
- Invalid JSON from the model is surfaced in the UI with an inline error message (and a truncated snippet) so you can regenerate quickly.
- Component import failures automatically fall back to primitive builders to keep the flow unblocked.
- Editing without a stored section selection raises a toast and UI warning instead of silently failing.

---

## 🔒 Security
- API keys are stored in \`clientStorage\` and UI \`localStorage\` for dev use.  
- For production release, integrate a backend token exchange and encrypt secrets.

---

## 🧪 QA Scenarios
- Generate hero section (desktop+mobile)  
- Edit hero → change H1 + CTA label  
- Features → switch from 2 to 3 columns  
- Pricing → generate 3 tiers + CTA  
- FAQ → generate 4 items  
- Edit mode guard → no section selected  

---

## 📄 License
MIT (for plugin code).  
Material 3 library © Google.  
Ensure you comply with Figma library licensing when publishing.
