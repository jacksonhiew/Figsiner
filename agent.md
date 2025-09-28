# Figsiner Agent Instructions

This file defines how an autonomous coding agent (e.g., Codex) should operate inside the Figsiner repository.

---

## 🔍 Scope

- The agent assists with **Phase-1 (Section Generator/Editor)** development.
- The agent follows the implementation plan in:
  - `docs/plan/phase1-section-engine.md`
  - `ops/checklist.yaml`

---

## 📖 Workflow

1. **Read plan**
   - Parse `docs/plan/phase1-section-engine.md` to understand architecture, repo structure, and implementation steps.

2. **Read checklist**
   - Open `ops/checklist.yaml` for machine-readable task items.
   - Open `docs/plan/checklist.md` for human-readable version.

3. **Execute tasks**
   - Implement features in the order listed under **Implementation Steps** in `phase1-section-engine.md`.
   - Ensure each deliverable matches the schemas, prompts, and tokens provided.

4. **Update checklist**
   - After completing a task, update `ops/checklist.yaml`:
     - Change `status: todo` → `doing` → `done`.
   - Mirror the change in `docs/plan/checklist.md` (check the corresponding box).
   - Commit both files along with code changes.

5. **Commit style**
   - Use descriptive commit messages referencing the checklist ID.
   - Example:  
     - `feat(renderer): add primitive builders (refs #renderer-primitives)`  
     - `chore(schema): add section.patch.schema.json (refs #schema-patch)`

---

## 📂 Key Files for Agent

- **Plans**
  - `docs/plan/phase1-section-engine.md`
  - `docs/plan/agent.md`
- **Checklists**
  - `docs/plan/checklist.md`
  - `ops/checklist.yaml`
- **Schemas**
  - `schemas/section.schema.json`
  - `schemas/section.patch.schema.json`
- **Prompts**
  - `prompts/section-generate.txt`
  - `prompts/section-edit.txt`
- **Tokens & Rules**
  - `tokens/design-tokens.json`
  - `tokens/design-rules.md`
- **Catalog**
  - `catalog/component-catalog.json`

---

## ✅ Success Criteria

- All tasks in `ops/checklist.yaml` marked as `done`.
- QA scenarios in `phase1-section-engine.md` pass in Figma desktop testing.
- Plugin runs locally:
  - Settings verify against `/models`
  - Section generation (desktop+mobile) works
  - Section edit (patch ops) works
- README and docs up to date.

---

## ⚠️ Guardrails

- Do not store API keys in code.
- Do not remove or overwrite existing checklists.
- If JSON schema or prompt validation fails, fix before committing.
- Respect Material 3 library licensing.

---

## 🧭 Agent Next Steps

1. Scaffold missing files from `phase1-section-engine.md`.
2. Implement renderer (primitives + component instances).
3. Implement prompt pipeline.
4. Verify with sample prompts.
5. Update checklist items step by step.
