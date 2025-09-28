import { clampToken } from '../tokens';
import type { PatchOperation, SectionNodeDefinition, TypographyStyle } from '../types/section';
import { applyLayoutConfig, applyTypographyStyle } from './primitive-builders';
import { createRenderableNode } from './render-section';
import { createComponentInstance } from './component-instance';

function findNodeByName(root: SceneNode, name: string): SceneNode | null {
  if ('name' in root && root.name === name) {
    return root;
  }
  if ('children' in root) {
    for (const child of root.children as readonly SceneNode[]) {
      const match = findNodeByName(child, name);
      if (match) {
        return match;
      }
    }
  }
  return null;
}

function getContentFrame(sectionFrame: FrameNode): FrameNode | null {
  for (const child of sectionFrame.children) {
    if (child.type === 'FRAME' && child.name === 'content') {
      return child as FrameNode;
    }
  }
  return null;
}

async function applyTypographyToNode(node: SceneNode, style?: TypographyStyle) {
  if (!style || node.type !== 'TEXT') {
    return;
  }
  await applyTypographyStyle(node, style);
}

async function handleUpdateSection(sectionFrame: FrameNode, op: Extract<PatchOperation, { op: 'updateSection' }>) {
  const changes = op.changes;
  if (changes.padding) {
    sectionFrame.paddingTop = clampToken(changes.padding.top, 'sectionPadding');
    sectionFrame.paddingRight = clampToken(changes.padding.right, 'sectionPadding');
    sectionFrame.paddingBottom = clampToken(changes.padding.bottom, 'sectionPadding');
    sectionFrame.paddingLeft = clampToken(changes.padding.left, 'sectionPadding');
  }
  if (changes.itemSpacing !== undefined) {
    sectionFrame.itemSpacing = clampToken(changes.itemSpacing, 'itemSpacing');
  }
  if (changes.layout) {
    const content = getContentFrame(sectionFrame);
    if (content) {
      applyLayoutConfig(content, changes.layout);
    }
  }
  if (changes.background && changes.background.type === 'solid') {
    const rgb = changes.background.color.replace('#', '');
    if (rgb.length === 6) {
      const value = Number.parseInt(rgb, 16);
      sectionFrame.fills = [
        {
          type: 'SOLID',
          color: { r: ((value >> 16) & 255) / 255, g: ((value >> 8) & 255) / 255, b: (value & 255) / 255 },
          opacity: changes.background.opacity ?? 1
        }
      ];
    }
  }
}

async function handleReplaceItemText(sectionFrame: FrameNode, op: Extract<PatchOperation, { op: 'replaceItemText' }>) {
  const node = findNodeByName(sectionFrame, op.targetId);
  if (!node || node.type !== 'TEXT') {
    return;
  }
  await applyTypographyToNode(node, op.style);
  node.characters = op.content;
}

async function handleUpdateItem(sectionFrame: FrameNode, op: Extract<PatchOperation, { op: 'updateItem' }>) {
  const node = findNodeByName(sectionFrame, op.targetId);
  if (!node) {
    return;
  }

  if (op.changes.layout) {
    if (node.type === 'FRAME' || node.type === 'TEXT' || node.type === 'RECTANGLE') {
      applyLayoutConfig(node, op.changes.layout);
    }
    if (node.type === 'INSTANCE') {
      applyLayoutConfig(node as unknown as FrameNode, op.changes.layout);
    }
  }

  if (op.changes.text && node.type === 'TEXT') {
    if (op.changes.text.style) {
      await applyTypographyStyle(node, op.changes.text.style);
    }
    if (op.changes.text.maxWidth) {
      node.resizeWithoutConstraints(op.changes.text.maxWidth, node.height);
    }
  }

  if (op.changes.button && node.type === 'FRAME') {
    const label = node.findOne((child) => child.type === 'TEXT') as TextNode | null;
    if (label) {
      if (op.changes.button.label) {
        label.characters = op.changes.button.label;
      }
      if (op.changes.button.variant) {
        await applyTypographyStyle(label, 'body');
      }
    }
    if (op.changes.button.width === 'fill') {
      node.layoutGrow = 1;
    } else if (op.changes.button.width === 'hug') {
      node.layoutGrow = 0;
    }
  }

  if (op.changes.useComponent) {
    const parent = node.parent as ChildrenMixin | null;
    if (!parent) {
      return;
    }
    const index = parent.children.indexOf(node);
    const instance = await createComponentInstance(op.changes.useComponent, op.changes.layout);
    if (instance) {
      parent.insertChild(index, instance);
      node.remove();
    }
  }
}

async function handleInsertItem(sectionFrame: FrameNode, op: Extract<PatchOperation, { op: 'insertItem' }>) {
  const parentNode = findNodeByName(sectionFrame, op.parentId);
  if (!parentNode || !('insertChild' in parentNode)) {
    return;
  }
  const childrenMixin = parentNode as unknown as ChildrenMixin;
  const newNode = await createRenderableNode(op.item as SectionNodeDefinition);
  newNode.name = op.item.id;
  let insertIndex = childrenMixin.children.length;
  if (typeof op.position === 'number') {
    insertIndex = Math.min(Math.max(op.position, 0), childrenMixin.children.length);
  } else if (op.position === 'start') {
    insertIndex = 0;
  }
  childrenMixin.insertChild(insertIndex, newNode);
}

function handleRemoveItem(sectionFrame: FrameNode, op: Extract<PatchOperation, { op: 'removeItem' }>) {
  const node = findNodeByName(sectionFrame, op.targetId);
  if (node) {
    node.remove();
  }
}

function handleReorderItem(sectionFrame: FrameNode, op: Extract<PatchOperation, { op: 'reorderItem' }>) {
  const node = findNodeByName(sectionFrame, op.targetId);
  if (!node) {
    return;
  }
  const parent = node.parent as ChildrenMixin | null;
  if (!parent) {
    return;
  }
  const currentIndex = parent.children.indexOf(node);
  parent.removeChild(currentIndex);
  let targetIndex = parent.children.length;
  if (op.beforeId) {
    const beforeIndex = parent.children.findIndex((child) => child.name === op.beforeId);
    if (beforeIndex >= 0) {
      targetIndex = beforeIndex;
    }
  } else if (op.afterId) {
    const afterIndex = parent.children.findIndex((child) => child.name === op.afterId);
    if (afterIndex >= 0) {
      targetIndex = afterIndex + 1;
    }
  }
  parent.insertChild(targetIndex, node);
}

export async function applySectionPatch(sectionFrame: FrameNode, ops: PatchOperation[]): Promise<void> {
  for (const op of ops) {
    switch (op.op) {
      case 'updateSection':
        await handleUpdateSection(sectionFrame, op);
        break;
      case 'replaceItemText':
        await handleReplaceItemText(sectionFrame, op);
        break;
      case 'updateItem':
        await handleUpdateItem(sectionFrame, op);
        break;
      case 'insertItem':
        await handleInsertItem(sectionFrame, op);
        break;
      case 'removeItem':
        handleRemoveItem(sectionFrame, op);
        break;
      case 'reorderItem':
        handleReorderItem(sectionFrame, op);
        break;
      default:
        console.warn('Unsupported patch operation', op);
        break;
    }
  }
}
