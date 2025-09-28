import { clampToken, tokens } from '../tokens';
import type { Section, SectionNodeDefinition, SectionResponse, SectionVariant, Viewport } from '../types/section';
import { buildPrimitiveNode, buildContainerNode, applyLayoutConfig } from './primitive-builders';
import { createComponentInstance } from './component-instance';

const VIEWPORT_CONFIG: Record<Viewport, { width: number; container: number }> = {
  desktop: { width: tokens.grid.desktop.viewport, container: tokens.grid.desktop.container },
  mobile: { width: tokens.grid.mobile.viewport, container: tokens.grid.mobile.container }
};

type ParentNode = BaseNode & ChildrenMixin;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 6) {
    return null;
  }
  const value = Number.parseInt(sanitized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function applyFrameFill(node: FrameNode, color: string, opacity = 1) {
  const rgb = hexToRgb(color);
  if (!rgb) {
    node.fills = [];
    return;
  }
  node.fills = [
    {
      type: 'SOLID',
      color: { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 },
      opacity
    }
  ];
}

export async function createRenderableNode(def: SectionNodeDefinition): Promise<SceneNode> {
  if (def.type === 'container') {
    return buildContainerNode(def, createRenderableNode);
  }

  if ('useComponent' in def && def.useComponent) {
    const instance = await createComponentInstance(def.useComponent, def.layout);
    if (instance) {
      instance.name = def.id;
      return instance;
    }
  }

  return buildPrimitiveNode(def);
}

function prepareSectionFrame(section: Section, viewport: Viewport, frame: FrameNode) {
  frame.name = `Section • ${section.type} • ${viewport}`;
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  frame.itemSpacing = clampToken(section.itemSpacing, 'itemSpacing');
  frame.paddingTop = clampToken(section.padding.top, 'sectionPadding');
  frame.paddingRight = clampToken(section.padding.right, 'sectionPadding');
  frame.paddingBottom = clampToken(section.padding.bottom, 'sectionPadding');
  frame.paddingLeft = clampToken(section.padding.left, 'sectionPadding');
  frame.counterAxisAlignItems = 'CENTER';
  frame.clipsContent = false;
  const viewportWidth = VIEWPORT_CONFIG[viewport].width;
  frame.resizeWithoutConstraints(viewportWidth, Math.max(frame.height, 100));

  if (section.background && section.background.type === 'solid') {
    applyFrameFill(frame, section.background.color, section.background.opacity ?? 1);
  } else {
    applyFrameFill(frame, tokens.colors.background);
  }
}

async function buildContentFrame(section: Section, viewport: Viewport): Promise<FrameNode> {
  const content = figma.createFrame();
  content.name = 'content';
  content.fills = [];
  content.layoutMode = section.layout?.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';
  content.primaryAxisSizingMode = 'AUTO';
  content.counterAxisSizingMode = 'FIXED';
  content.itemSpacing = clampToken(section.itemSpacing, 'itemSpacing');
  applyLayoutConfig(content, section.layout);
  const containerWidth = VIEWPORT_CONFIG[viewport].container;
  content.resizeWithoutConstraints(containerWidth, Math.max(content.height, 100));

  for (const item of section.items) {
    const node = await createRenderableNode(item);
    node.name = item.id;
    content.appendChild(node);
  }

  return content;
}

async function renderSectionVariant(
  variant: SectionVariant,
  parent: ParentNode,
  target?: FrameNode
): Promise<FrameNode> {
  const sectionFrame = target ?? figma.createFrame();
  if (!target) {
    parent.appendChild(sectionFrame);
  }

  while (sectionFrame.children.length > 0) {
    sectionFrame.children[0].remove();
  }

  prepareSectionFrame(variant.section, variant.viewport, sectionFrame);
  const contentFrame = await buildContentFrame(variant.section, variant.viewport);
  sectionFrame.appendChild(contentFrame);
  return sectionFrame;
}

export interface RenderOptions {
  parent?: ParentNode;
  targets?: Partial<Record<Viewport, FrameNode>>;
}

export interface RenderResult {
  desktop?: FrameNode;
  mobile?: FrameNode;
}

export async function renderSectionVariants(
  response: SectionResponse,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const parent = options.parent ?? figma.currentPage;
  const result: RenderResult = {};
  for (const variant of response.variants) {
    const target = options.targets?.[variant.viewport];
    const frame = await renderSectionVariant(variant, parent, target);
    result[variant.viewport] = frame;
  }
  return result;
}
