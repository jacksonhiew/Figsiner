// Minimal Figma plugin typings used for offline development.
// These stubs provide the shapes needed by TypeScript when the official
// @figma/plugin-typings package cannot be installed in the sandbox.

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface ShowUIOptions {
  width?: number;
  height?: number;
  themeColors?: boolean;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface UIPostMessageOptions {
  origin?: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface UIAPI {
  postMessage(message: unknown, options?: UIPostMessageOptions): void;
  onmessage: ((pluginMessage: unknown) => void) | null;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface ClientStorageAPI {
  getAsync(key: string): Promise<unknown>;
  setAsync(key: string, value: unknown): Promise<void>;
}

// Core node aliases used throughout the plugin renderer.
type SceneNode = any;
type FrameNode = any;
type TextNode = any;
type RectangleNode = any;
type InstanceNode = any;
type ComponentNode = any;
type ParentNode = any;
type GeometryMixin = any;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface PluginAPI {
  readonly command: string | undefined;
  readonly root: {
    getPluginData(key: string): string;
    setPluginData(key: string, value: string): void;
  };
  readonly currentPage: {
    selection: SceneNode[];
    appendChild(node: SceneNode): void;
  };
  readonly viewport: {
    scrollAndZoomIntoView(nodes: SceneNode[]): void;
  };
  readonly ui: UIAPI;
  clientStorage: ClientStorageAPI;
  createFrame(): FrameNode;
  createRectangle(): RectangleNode;
  createText(): TextNode;
  importComponentByKeyAsync(key: string): Promise<ComponentNode>;
  loadFontAsync(font: { family: string; style: string }): Promise<void>;
  notify(message: string, options?: { error?: boolean; timeout?: number }): void;
  showUI(html: string, options?: ShowUIOptions): void;
}

declare const figma: PluginAPI;
declare const __html__: string;
