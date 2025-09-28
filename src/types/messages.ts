export interface StoredSettings {
  host: string;
  apiKey: string;
  model: string;
}

export interface GenerateSectionRequest {
  prompt: string;
  settings: StoredSettings;
}

export interface EditSectionRequest {
  editBrief: string;
  settings: StoredSettings;
}

export type PluginRequestMessage =
  | { type: 'REQUEST_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; payload: StoredSettings }
  | { type: 'VERIFY_SETTINGS'; payload: StoredSettings }
  | { type: 'GENERATE_SECTION'; payload: GenerateSectionRequest }
  | { type: 'EDIT_SECTION'; payload: EditSectionRequest };

export type PluginResponseMessage =
  | { type: 'SETTINGS'; payload: StoredSettings | null }
  | { type: 'SETTINGS_SAVED' }
  | { type: 'SETTINGS_VERIFIED'; payload: { ok: boolean; models?: string[]; error?: string } }
  | { type: 'GENERATION_SUCCESS'; payload: { viewportFrames: Record<string, string> } }
  | { type: 'GENERATION_ERROR'; payload: { message: string } }
  | { type: 'PATCH_SUCCESS' }
  | { type: 'PATCH_ERROR'; payload: { message: string } };
