import { ensureTypographyFont, loadFont } from './font-loader';
import { clampToken, getTypography, tokens } from '../tokens';
import type {
  AutoLayoutConfig,
  ButtonNodeDefinition,
  ContainerNodeDefinition,
  ImageNodeDefinition,
  ListItemDefinition,
  ListNodeDefinition,
  SectionNodeDefinition,
  TextNodeDefinition,
  TypographyStyle
} from '../types/section';

function mapAlign(value: AutoLayoutConfig['alignItems']): 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' {
  switch (value) {
    case 'center':
      return 'CENTER';
    case 'end':
      return 'MAX';
    case 'stretch':
      return 'STRETCH';
    case 'start':
    default:
      return 'MIN';
  }
}

function mapJustify(value: AutoLayoutConfig['justifyContent']): 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' {
  switch (value) {
    case 'center':
      return 'CENTER';
    case 'end':
      return 'MAX';
    case 'space-between':
      return 'SPACE_BETWEEN';
    case 'start':
    default:
      return 'MIN';
  }
}

export function applyLayoutConfig(node: FrameNode | TextNode | RectangleNode, config?: AutoLayoutConfig) {
  if (!config) {
    if ('layoutGrow' in node) {
      node.layoutGrow = 0;
    }
    return;
  }

  if ('layoutMode' in node) {
    node.layoutMode = config.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';
    if (config.alignItems) {
      node.counterAxisAlignItems = mapAlign(config.alignItems);
    }
    if (config.justifyContent) {
      node.primaryAxisAlignItems = mapJustify(config.justifyContent);
    }
    if (config.itemSpacing !== undefined) {
      node.itemSpacing = clampToken(config.itemSpacing, 'itemSpacing');
    }
    if (config.padding) {
      const padding = config.padding;
      node.paddingTop = clampToken(padding.top, 'sectionPadding');
      node.paddingRight = clampToken(padding.right, 'sectionPadding');
      node.paddingBottom = clampToken(padding.bottom, 'sectionPadding');
      node.paddingLeft = clampToken(padding.left, 'sectionPadding');
    }
  }

  if ('layoutGrow' in node) {
    node.layoutGrow = config.width === 'fill' ? 1 : 0;
  }
}

function setSolidFill(node: GeometryMixin, colorHex: string, opacity = 1) {
  const rgb = hexToRgb(colorHex);
  if (!rgb) {
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

export async function applyTypographyStyle(node: TextNode, style: TypographyStyle) {
  const token = getTypography(style);
  await ensureTypographyFont(style);
  node.fontName = { family: token.fontFamily, style: token.fontStyle };
  node.fontSize = token.fontSize;
  node.lineHeight = { unit: 'PIXELS', value: token.lineHeight };
  const textColor = hexToRgb(tokens.colors.text) ?? { r: 32, g: 32, b: 32 };
  node.fills = [
    {
      type: 'SOLID',
      color: { r: textColor.r / 255, g: textColor.g / 255, b: textColor.b / 255 }
    }
  ];
}

export async function buildTextNode(def: TextNodeDefinition): Promise<TextNode> {
  const node = figma.createText();
  node.name = def.id;
  await applyTypographyStyle(node, def.text.style);
  node.characters = def.text.content;
  node.textAutoResize = 'WIDTH_AND_HEIGHT';
  if (def.text.maxWidth) {
    const width = Math.min(def.text.maxWidth, 1200);
    node.resizeWithoutConstraints(width, node.height);
  }
  applyLayoutConfig(node, def.layout);
  return node;
}

export async function buildButtonNode(def: ButtonNodeDefinition): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = def.id;
  frame.layoutMode = 'HORIZONTAL';
  frame.counterAxisSizingMode = 'AUTO';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.itemSpacing = clampToken(12, 'itemSpacing');
  frame.paddingTop = frame.paddingBottom = clampToken(12, 'itemSpacing');
  frame.paddingLeft = frame.paddingRight = clampToken(16, 'sectionPadding');
  frame.cornerRadius = clampToken(8, 'radius');
  const accent = hexToRgb(tokens.colors.accent) ?? { r: 103, g: 80, b: 164 };
  frame.fills = [
    {
      type: 'SOLID',
      color: { r: accent.r / 255, g: accent.g / 255, b: accent.b / 255 }
    }
  ];

  const label = figma.createText();
  await loadFont('Inter', 'Medium');
  label.fontName = { family: 'Inter', style: 'Medium' };
  label.fontSize = 16;
  label.lineHeight = { unit: 'PIXELS', value: 20 };
  label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  label.characters = def.button.label;
  label.textAutoResize = 'WIDTH_AND_HEIGHT';

  frame.appendChild(label);

  if (def.button.width === 'fill') {
    frame.layoutGrow = 1;
  }

  applyLayoutConfig(frame, def.layout);
  return frame;
}

export async function buildImageNode(def: ImageNodeDefinition): Promise<RectangleNode> {
  const rect = figma.createRectangle();
  rect.name = def.id;
  const width = 320;
  const height = width / Math.max(def.image.aspectRatio, 0.1);
  rect.resize(width, height);
  rect.cornerRadius = clampToken(def.image.cornerRadius ?? 12, 'radius');
  setSolidFill(rect, tokens.colors.surfaceAlt, 1);
  return rect;
}

async function buildListItem(item: ListItemDefinition): Promise<FrameNode> {
  const row = figma.createFrame();
  row.layoutMode = 'VERTICAL';
  row.counterAxisSizingMode = 'AUTO';
  row.primaryAxisSizingMode = 'AUTO';
  row.itemSpacing = clampToken(4, 'itemSpacing');
  row.fills = [];
  row.paddingTop = row.paddingBottom = 0;
  row.paddingLeft = row.paddingRight = 0;

  const title = figma.createText();
  await applyTypographyStyle(title, 'h3');
  title.characters = item.title;
  row.appendChild(title);

  if (item.subtitle) {
    const subtitle = figma.createText();
    await applyTypographyStyle(subtitle, 'body');
    subtitle.characters = item.subtitle;
    row.appendChild(subtitle);
  }

  return row;
}

export async function buildListNode(def: ListNodeDefinition): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = def.id;
  frame.layoutMode = 'VERTICAL';
  frame.counterAxisSizingMode = 'AUTO';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.itemSpacing = clampToken(def.layout?.itemSpacing ?? 12, 'itemSpacing');
  frame.fills = [];

  for (const item of def.items) {
    const row = await buildListItem(item);
    frame.appendChild(row);
  }

  applyLayoutConfig(frame, def.layout);
  return frame;
}

export async function buildContainerNode(
  def: ContainerNodeDefinition,
  buildChild: (child: SectionNodeDefinition) => Promise<SceneNode>
): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = def.id;
  frame.counterAxisSizingMode = 'AUTO';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.fills = [];

  if (def.background && def.background.type === 'solid') {
    setSolidFill(frame, def.background.color, def.background.opacity ?? 1);
  }

  applyLayoutConfig(frame, def.layout);

  for (const child of def.children) {
    const node = await buildChild(child);
    frame.appendChild(node);
  }

  return frame;
}

export async function buildPrimitiveNode(def: SectionNodeDefinition): Promise<SceneNode> {
  switch (def.type) {
    case 'text':
      return buildTextNode(def);
    case 'button':
      return buildButtonNode(def);
    case 'image':
      return buildImageNode(def);
    case 'list':
      return buildListNode(def);
    case 'container':
      return buildContainerNode(def, buildPrimitiveNode);
    case 'component': {
      const placeholder = figma.createFrame();
      placeholder.name = `${def.id}-component-placeholder`;
      placeholder.layoutMode = 'VERTICAL';
      placeholder.counterAxisSizingMode = 'AUTO';
      placeholder.primaryAxisSizingMode = 'AUTO';
      placeholder.fills = [];
      applyLayoutConfig(placeholder, def.layout);
      return placeholder;
    }
    default:
      return figma.createFrame();
  }
}
