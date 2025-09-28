export type Viewport = 'desktop' | 'mobile';

export interface SectionResponse {
  meta: {
    schema: 'section-1.0-multi';
  };
  variants: SectionVariant[];
}

export interface SectionVariant {
  viewport: Viewport;
  section: Section;
}

export type SectionType = 'hero' | 'features' | 'pricing' | 'faq' | 'custom';
export type ItemRole = 'heading' | 'subheading' | 'body' | 'cta' | 'feature' | 'price' | 'faq' | 'media' | 'support' | 'list';
export type NodeWidth = 'hug' | 'fill';
export type LayoutDirection = 'horizontal' | 'vertical';
export type AlignItems = 'start' | 'center' | 'end' | 'stretch';
export type JustifyContent = 'start' | 'center' | 'end' | 'space-between';
export type TypographyStyle = 'h1' | 'h2' | 'h3' | 'body' | 'small';
export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'text';

export interface SpacingInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AutoLayoutConfig {
  direction?: LayoutDirection;
  alignItems?: AlignItems;
  justifyContent?: JustifyContent;
  columns?: number;
  itemSpacing?: number;
  padding?: SpacingInset;
  width?: NodeWidth;
}

export interface SolidFill {
  type: 'solid';
  color: string;
  opacity?: number;
}

export type BackgroundFill = SolidFill;

export interface UseComponent {
  componentKey: string;
  variant?: Record<string, string>;
}

export interface BaseNodeDefinition {
  id: string;
  role?: ItemRole;
  layout?: AutoLayoutConfig;
}

export interface TextNodeDefinition extends BaseNodeDefinition {
  type: 'text';
  text: {
    content: string;
    style: TypographyStyle;
    maxWidth?: number;
  };
}

export interface ButtonNodeDefinition extends BaseNodeDefinition {
  type: 'button';
  button: {
    label: string;
    variant: ButtonVariant;
    width?: NodeWidth;
  };
  useComponent?: UseComponent;
}

export interface ImageNodeDefinition extends BaseNodeDefinition {
  type: 'image';
  image: {
    source: 'placeholder' | 'remote';
    url?: string;
    alt?: string;
    aspectRatio: number;
    cornerRadius?: number;
  };
}

export interface ListItemDefinition {
  title: string;
  subtitle?: string;
  icon?: UseComponent;
}

export interface ListNodeDefinition extends BaseNodeDefinition {
  type: 'list';
  items: ListItemDefinition[];
}

export interface ContainerNodeDefinition extends BaseNodeDefinition {
  type: 'container';
  children: SectionNodeDefinition[];
  background?: BackgroundFill;
  layout: AutoLayoutConfig;
}

export interface ComponentNodeDefinition extends BaseNodeDefinition {
  type: 'component';
  useComponent: UseComponent;
}

export type SectionNodeDefinition =
  | TextNodeDefinition
  | ButtonNodeDefinition
  | ImageNodeDefinition
  | ListNodeDefinition
  | ContainerNodeDefinition
  | ComponentNodeDefinition;

export interface Section {
  type: SectionType;
  theme?: 'light' | 'dark';
  heading?: string;
  subheading?: string;
  padding: SpacingInset;
  itemSpacing: number;
  layout?: AutoLayoutConfig;
  background?: BackgroundFill;
  items: SectionNodeDefinition[];
}

export interface SectionPatchResponse {
  meta: {
    schema: 'section-patch-1.0';
  };
  ops: PatchOperation[];
}

export type PatchOperation =
  | {
      op: 'updateSection';
      changes: Partial<Pick<Section, 'padding' | 'itemSpacing' | 'layout' | 'background' | 'heading' | 'subheading'>>;
    }
  | {
      op: 'replaceItemText';
      targetId: string;
      content: string;
      style?: TypographyStyle;
    }
  | {
      op: 'updateItem';
      targetId: string;
      changes: {
        layout?: AutoLayoutConfig;
        button?: Partial<ButtonNodeDefinition['button']>;
        text?: Partial<TextNodeDefinition['text']>;
        useComponent?: UseComponent;
      };
    }
  | {
      op: 'insertItem';
      parentId: string;
      position: 'start' | 'end' | number;
      item: SectionNodeDefinition;
    }
  | {
      op: 'removeItem';
      targetId: string;
    }
  | {
      op: 'reorderItem';
      targetId: string;
      beforeId?: string;
      afterId?: string;
    };
