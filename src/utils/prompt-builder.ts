import generateTemplate from '../../prompts/section-generate.txt?raw';
import editTemplate from '../../prompts/section-edit.txt?raw';
import designRules from '../../tokens/design-rules.md?raw';
import designTokens from '../../tokens/design-tokens.json';
import componentCatalog from '../../catalog/component-catalog.json';

function substitute(template: string, replacements: Record<string, string>): string {
  return template.replace(/<<<\{(.*?)\}>>>/g, (_match, key) => replacements[key] ?? '');
}

const TOKENS_JSON = JSON.stringify(designTokens, null, 2);
const RULES_TEXT = designRules.trim();
const CATALOG_JSON = JSON.stringify(componentCatalog, null, 2);

export function buildGeneratePrompt(userBrief: string): string {
  return substitute(generateTemplate, {
    USER_BRIEF: userBrief.trim(),
    DESIGN_TOKENS_JSON: TOKENS_JSON,
    DESIGN_RULES_MARKDOWN: RULES_TEXT,
    COMPONENT_CATALOG_JSON: CATALOG_JSON
  });
}

export function buildEditPrompt(currentSectionJson: string, editBrief: string): string {
  return substitute(editTemplate, {
    CURRENT_SECTION_JSON: currentSectionJson,
    EDIT_BRIEF: editBrief.trim(),
    DESIGN_TOKENS_JSON: TOKENS_JSON,
    DESIGN_RULES_MARKDOWN: RULES_TEXT,
    COMPONENT_CATALOG_JSON: CATALOG_JSON
  });
}
