import type { AutoLayoutConfig, UseComponent } from '../types/section';
import { applyLayoutConfig } from './primitive-builders';

export async function createComponentInstance(def: UseComponent, layout?: AutoLayoutConfig): Promise<InstanceNode | null> {
  try {
    const component = await figma.importComponentByKeyAsync(def.componentKey);
    const instance = component.createInstance();
    instance.name = component.name;
    if (def.variant && 'setProperties' in instance) {
      try {
        instance.setProperties(def.variant);
      } catch (error) {
        console.warn('Failed to set variant properties', def.variant, error);
      }
    }
    applyLayoutConfig(instance as unknown as FrameNode, layout);
    return instance;
  } catch (error) {
    console.warn('Component import failed, falling back to primitives', def.componentKey, error);
    return null;
  }
}
