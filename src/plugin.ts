import uiHtml from './ui.html?raw';
import type { PluginRequestMessage, PluginResponseMessage, StoredSettings } from './types/messages';
import type {
  ButtonNodeDefinition,
  PatchOperation,
  Section,
  SectionNodeDefinition,
  SectionResponse,
  Viewport
} from './types/section';
import { buildEditPrompt, buildGeneratePrompt } from './utils/prompt-builder';
import { parsePatchResponse, parseSectionResponse } from './utils/schema-validators';
import { renderSectionVariants } from './renderer/render-section';
import { applySectionPatch } from './renderer/patch-applier';

figma.showUI(uiHtml, { width: 420, height: 540 });

const SETTINGS_KEY = 'figsiner.settings';
const SECTION_DATA_KEY = 'figsiner:section';
const VIEWPORT_KEY = 'figsiner:viewport';

async function loadSettings(): Promise<StoredSettings | null> {
  return (await figma.clientStorage.getAsync(SETTINGS_KEY)) ?? null;
}

async function saveSettings(settings: StoredSettings): Promise<void> {
  await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
}

async function verifySettings(host: string, apiKey: string, model: string): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  try {
    const endpoint = new URL('/v1/models', host);
    const response = await fetch(endpoint.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { ok: false, error: `Request failed (${response.status})` };
    }

    const json = (await response.json()) as { data?: Array<{ id: string }> };
    const models = json?.data?.map((item) => item.id) ?? [];
    if (models.length === 0) {
      return { ok: false, error: 'No models returned from host' };
    }

    if (!models.includes(model)) {
      return { ok: false, models, error: `Model "${model}" not found` };
    }

    return { ok: true, models };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

type ParentNode = BaseNode & ChildrenMixin;

function stripCodeFence(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }
  const lines = trimmed.split('\n');
  if (lines[0].startsWith('```')) {
    lines.shift();
  }
  if (lines[lines.length - 1].trim() === '```') {
    lines.pop();
  }
  return lines.join('\n').trim();
}

function parseJsonWithSnippet(jsonString: string, context: string) {
  try {
    return JSON.parse(jsonString) as unknown;
  } catch (error) {
    const snippet = jsonString.slice(0, 200);
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new Error(`${context}: ${message}. Snippet: ${snippet}`);
  }
}

async function requestSectionFromApi(prompt: string, settings: StoredSettings): Promise<SectionResponse> {
  const endpoint = new URL('/v1/chat/completions', settings.host);
  const systemPrompt = buildGeneratePrompt(prompt);
  const body = {
    model: settings.model,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]
  };

  const response = await fetch(endpoint.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Generation request failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Model returned an empty response');
  }

  const jsonString = stripCodeFence(content);
  const parsed = parseJsonWithSnippet(jsonString, 'Generation JSON parse error');
  return parseSectionResponse(parsed);
}

function resolveGenerationTargets(): { parent: ParentNode; targets: Partial<Record<Viewport, FrameNode>> } {
  const selection = figma.currentPage.selection.filter((node): node is FrameNode => node.type === 'FRAME');
  const parent = (selection[0]?.parent ?? figma.currentPage) as ParentNode;
  const targets: Partial<Record<Viewport, FrameNode>> = {};
  if (selection[0]) {
    targets.desktop = selection[0];
  }
  if (selection[1]) {
    targets.mobile = selection[1];
  }
  return { parent, targets };
}

function storeSectionPluginData(
  response: SectionResponse,
  result: { desktop?: FrameNode; mobile?: FrameNode }
) {
  for (const variant of response.variants) {
    const targetFrame = variant.viewport === 'desktop' ? result.desktop : result.mobile;
    if (targetFrame) {
      targetFrame.setPluginData(VIEWPORT_KEY, variant.viewport);
      targetFrame.setPluginData(SECTION_DATA_KEY, JSON.stringify(variant.section));
    }
  }
}

function positionGeneratedFrames(
  result: { desktop?: FrameNode; mobile?: FrameNode },
  hadTargets: { desktop: boolean; mobile: boolean }
) {
  const { desktop, mobile } = result;
  const center = figma.viewport.center;

  if (desktop && !hadTargets.desktop) {
    desktop.x = center.x - desktop.width / 2;
    desktop.y = center.y - desktop.height / 2;
  }

  if (mobile) {
    if (!hadTargets.mobile) {
      if (desktop) {
        mobile.x = desktop.x + desktop.width + 160;
        mobile.y = desktop.y;
      } else {
        mobile.x = center.x - mobile.width / 2;
        mobile.y = center.y - mobile.height / 2;
      }
    }
  }

  const nodes = [desktop, mobile].filter((node): node is SceneNode => Boolean(node));
  if (nodes.length > 0) {
    figma.viewport.scrollAndZoomIntoView(nodes);
  }
}

async function handleGenerateSection(prompt: string, settings: StoredSettings) {
  try {
    const sectionData = await requestSectionFromApi(prompt, settings);
    const { parent, targets } = resolveGenerationTargets();
    const hadTargets = { desktop: Boolean(targets.desktop), mobile: Boolean(targets.mobile) };
    const renderResult = await renderSectionVariants(sectionData, { parent, targets });
    storeSectionPluginData(sectionData, renderResult);
    positionGeneratedFrames(renderResult, hadTargets);
    const selection = [renderResult.desktop, renderResult.mobile].filter((node): node is FrameNode => Boolean(node));
    if (selection.length) {
      figma.currentPage.selection = selection;
    }
    const viewportFrames: Record<string, string> = {};
    if (renderResult.desktop) {
      viewportFrames.desktop = renderResult.desktop.id;
    }
    if (renderResult.mobile) {
      viewportFrames.mobile = renderResult.mobile.id;
    }
    figma.ui.postMessage({ type: 'GENERATION_SUCCESS', payload: { viewportFrames } } satisfies PluginResponseMessage);
    figma.notify('Section generated');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    figma.ui.postMessage({ type: 'GENERATION_ERROR', payload: { message } } satisfies PluginResponseMessage);
    figma.notify(`Generation failed: ${message}`);
  }
}

async function handleEditSection(editBrief: string, settings: StoredSettings) {
  try {
    const selection = figma.currentPage.selection.find((node): node is FrameNode => node.type === 'FRAME');
    if (!selection) {
      throw new Error('Select a generated section frame before editing.');
    }

    const stored = getStoredSection(selection);
    if (!stored) {
      throw new Error('Selected frame does not contain stored section data.');
    }

    const patchResponse = await requestPatchFromApi(stored.section, editBrief, settings);
    await applySectionPatch(selection, patchResponse.ops);
    const updatedSection = applyPatchToSectionData(stored.section, patchResponse.ops);
    selection.setPluginData(SECTION_DATA_KEY, JSON.stringify(updatedSection));
    figma.ui.postMessage({ type: 'PATCH_SUCCESS' } satisfies PluginResponseMessage);
    figma.notify('Patch applied');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    figma.ui.postMessage({ type: 'PATCH_ERROR', payload: { message } } satisfies PluginResponseMessage);
    figma.notify(`Patch failed: ${message}`);
  }
}

function getStoredSection(frame: FrameNode): { viewport: Viewport; section: Section } | null {
  const viewport = frame.getPluginData(VIEWPORT_KEY) as Viewport | '';
  const raw = frame.getPluginData(SECTION_DATA_KEY);
  if ((viewport !== 'desktop' && viewport !== 'mobile') || !raw) {
    return null;
  }
  try {
    const section = JSON.parse(raw) as Section;
    return { viewport, section };
  } catch (error) {
    console.warn('Failed to parse stored section data', error);
    return null;
  }
}

async function requestPatchFromApi(section: Section, editBrief: string, settings: StoredSettings) {
  const endpoint = new URL('/v1/chat/completions', settings.host);
  const currentJson = JSON.stringify(section, null, 2);
  const systemPrompt = buildEditPrompt(currentJson, editBrief);
  const body = {
    model: settings.model,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: editBrief }
    ]
  };

  const response = await fetch(endpoint.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Patch request failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Model returned an empty patch response');
  }

  const jsonString = stripCodeFence(content);
  const parsed = parseJsonWithSnippet(jsonString, 'Patch JSON parse error');
  return parsePatchResponse(parsed);
}

interface NodeContext {
  parentItems: SectionNodeDefinition[];
  index: number;
  node: SectionNodeDefinition;
}

function findNodeContext(items: SectionNodeDefinition[], id: string): NodeContext | null {
  for (let index = 0; index < items.length; index += 1) {
    const node = items[index];
    if (node.id === id) {
      return { parentItems: items, index, node };
    }
    if (node.type === 'container') {
      const match = findNodeContext(node.children, id);
      if (match) {
        return match;
      }
    }
  }
  return null;
}

function getChildrenArray(section: Section, parentId: string): SectionNodeDefinition[] | null {
  if (parentId === 'root') {
    return section.items;
  }
  const context = findNodeContext(section.items, parentId);
  if (!context) {
    return null;
  }
  if (context.node.type === 'container') {
    return context.node.children;
  }
  return null;
}

function applyPatchToSectionData(section: Section, ops: PatchOperation[]): Section {
  const clone = JSON.parse(JSON.stringify(section)) as Section;
  for (const op of ops) {
    switch (op.op) {
      case 'updateSection': {
        if (op.changes.padding) {
          clone.padding = { ...clone.padding, ...op.changes.padding };
        }
        if (op.changes.itemSpacing !== undefined) {
          clone.itemSpacing = op.changes.itemSpacing;
        }
        if (op.changes.layout) {
          clone.layout = { ...clone.layout, ...op.changes.layout };
        }
        if (op.changes.background) {
          clone.background = op.changes.background as Section['background'];
        }
        if (op.changes.heading !== undefined) {
          clone.heading = op.changes.heading;
        }
        if (op.changes.subheading !== undefined) {
          clone.subheading = op.changes.subheading;
        }
        break;
      }
      case 'replaceItemText': {
        const context = findNodeContext(clone.items, op.targetId);
        if (context && context.node.type === 'text') {
          context.node.text.content = op.content;
          if (op.style) {
            context.node.text.style = op.style;
          }
        }
        break;
      }
      case 'updateItem': {
        const context = findNodeContext(clone.items, op.targetId);
        if (!context) {
          break;
        }
        const node = context.node;
        if (op.changes.layout) {
          node.layout = { ...node.layout, ...op.changes.layout };
        }
        if (node.type === 'text' && op.changes.text) {
          node.text = { ...node.text, ...op.changes.text };
        }
        if (node.type === 'button' && op.changes.button) {
          node.button = { ...node.button, ...op.changes.button };
        }
        if (op.changes.useComponent) {
          if (node.type === 'button') {
            node.useComponent = op.changes.useComponent;
          } else if (node.type === 'component') {
            node.useComponent = op.changes.useComponent;
          }
        }
        break;
      }
      case 'insertItem': {
        const parentItems = getChildrenArray(clone, op.parentId);
        if (parentItems) {
          const newItem = JSON.parse(JSON.stringify(op.item)) as SectionNodeDefinition;
          if (op.position === 'start') {
            parentItems.unshift(newItem);
          } else if (typeof op.position === 'number') {
            parentItems.splice(Math.min(Math.max(op.position, 0), parentItems.length), 0, newItem);
          } else {
            parentItems.push(newItem);
          }
        }
        break;
      }
      case 'removeItem': {
        const context = findNodeContext(clone.items, op.targetId);
        if (context) {
          context.parentItems.splice(context.index, 1);
        }
        break;
      }
      case 'reorderItem': {
        const context = findNodeContext(clone.items, op.targetId);
        if (!context) {
          break;
        }
        const sourceArray = context.parentItems;
        const [node] = sourceArray.splice(context.index, 1);
        let targetIndex = sourceArray.length;
        if (op.beforeId) {
          const beforeIndex = sourceArray.findIndex((child) => child.id === op.beforeId);
          if (beforeIndex >= 0) {
            targetIndex = beforeIndex;
          }
        } else if (op.afterId) {
          const afterIndex = sourceArray.findIndex((child) => child.id === op.afterId);
          if (afterIndex >= 0) {
            targetIndex = afterIndex + 1;
          }
        }
        sourceArray.splice(Math.min(Math.max(targetIndex, 0), sourceArray.length), 0, node);
        break;
      }
      default:
        break;
    }
  }
  return clone;
}

figma.ui.onmessage = async (msg: PluginRequestMessage) => {
  switch (msg.type) {
    case 'REQUEST_SETTINGS': {
      const settings = await loadSettings();
      const response: PluginResponseMessage = { type: 'SETTINGS', payload: settings };
      figma.ui.postMessage(response);
      break;
    }
    case 'SAVE_SETTINGS': {
      await saveSettings(msg.payload);
      figma.ui.postMessage({ type: 'SETTINGS_SAVED' } satisfies PluginResponseMessage);
      break;
    }
    case 'VERIFY_SETTINGS': {
      const result = await verifySettings(msg.payload.host, msg.payload.apiKey, msg.payload.model);
      figma.ui.postMessage({ type: 'SETTINGS_VERIFIED', payload: result } satisfies PluginResponseMessage);
      break;
    }
    case 'GENERATE_SECTION': {
      await handleGenerateSection(msg.payload.prompt, msg.payload.settings);
      break;
    }
    case 'EDIT_SECTION': {
      await handleEditSection(msg.payload.editBrief, msg.payload.settings);
      break;
    }
    default:
      // No-op
      break;
  }
};
