import type { PluginRequestMessage, PluginResponseMessage, StoredSettings } from './types/messages';

const hostInput = document.getElementById('host') as HTMLInputElement;
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const modelInput = document.getElementById('model') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const verifyButton = document.getElementById('verify') as HTMLButtonElement;
const saveButton = document.getElementById('save') as HTMLButtonElement;
const generateTextarea = document.getElementById('generatePrompt') as HTMLTextAreaElement;
const editTextarea = document.getElementById('editBrief') as HTMLTextAreaElement;
const generateButton = document.getElementById('generateBtn') as HTMLButtonElement;
const editButton = document.getElementById('editBtn') as HTMLButtonElement;
const tabs = Array.from(document.querySelectorAll<HTMLDivElement>('.tab'));
const panels = Array.from(document.querySelectorAll<HTMLElement>('.panel'));

const LOCAL_STORAGE_KEY = 'figsiner.ui.settings';

function sendMessage(message: PluginRequestMessage) {
  parent.postMessage({ pluginMessage: message }, '*');
}

function readUiSettings(): StoredSettings | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSettings) : null;
  } catch (error) {
    console.error('Failed to read stored UI settings', error);
    return null;
  }
}

function persistUiSettings(settings: StoredSettings) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
}

function collectSettingsFromInputs(): StoredSettings {
  return {
    host: hostInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim()
  };
}

function applySettingsToInputs(settings: StoredSettings | null) {
  if (!settings) {
    return;
  }

  hostInput.value = settings.host ?? '';
  apiKeyInput.value = settings.apiKey ?? '';
  modelInput.value = settings.model ?? '';
}

function setStatus(message: string, tone: 'default' | 'success' | 'error' = 'default') {
  statusEl.textContent = message;
  statusEl.style.color = tone === 'error' ? 'var(--figma-color-text-danger)' : tone === 'success' ? 'var(--figma-color-text-success)' : 'inherit';
}

function toggleLoading(target: HTMLButtonElement, loading: boolean) {
  if (loading) {
    target.dataset.originalText = target.textContent ?? '';
    target.textContent = 'Working…';
    target.setAttribute('disabled', 'true');
  } else {
    const original = target.dataset.originalText ?? '';
    target.textContent = original || 'Submit';
    target.removeAttribute('disabled');
  }
}

function switchTab(tabId: string) {
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });

  panels.forEach((panel) => {
    panel.classList.toggle('hidden', panel.id !== tabId);
  });
}

verifyButton.addEventListener('click', () => {
  const settings = collectSettingsFromInputs();
  persistUiSettings(settings);
  setStatus('Verifying…');
  toggleLoading(verifyButton, true);
  sendMessage({ type: 'VERIFY_SETTINGS', payload: settings });
});

saveButton.addEventListener('click', () => {
  const settings = collectSettingsFromInputs();
  persistUiSettings(settings);
  sendMessage({ type: 'SAVE_SETTINGS', payload: settings });
});

generateButton.addEventListener('click', () => {
  const settings = collectSettingsFromInputs();
  const prompt = generateTextarea.value.trim();
  if (!prompt) {
    setStatus('Please provide a prompt before generating.', 'error');
    return;
  }
  toggleLoading(generateButton, true);
  setStatus('Generating section…');
  sendMessage({
    type: 'GENERATE_SECTION',
    payload: {
      prompt,
      settings
    }
  });
});

editButton.addEventListener('click', () => {
  const settings = collectSettingsFromInputs();
  const editBrief = editTextarea.value.trim();
  if (!editBrief) {
    setStatus('Provide an edit brief before applying.', 'error');
    return;
  }
  toggleLoading(editButton, true);
  setStatus('Applying patch…');
  sendMessage({
    type: 'EDIT_SECTION',
    payload: {
      editBrief,
      settings
    }
  });
});

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    const tabId = tab.dataset.tab;
    if (tabId) {
      switchTab(tabId);
    }
  });
}

window.onmessage = (event: MessageEvent<{ pluginMessage: PluginResponseMessage }>) => {
  const message = event.data.pluginMessage;
  if (!message) {
    return;
  }

  switch (message.type) {
    case 'SETTINGS': {
      applySettingsToInputs(message.payload);
      if (message.payload) {
        persistUiSettings(message.payload);
      }
      break;
    }
    case 'SETTINGS_SAVED': {
      setStatus('Settings saved locally.', 'success');
      break;
    }
    case 'SETTINGS_VERIFIED': {
      toggleLoading(verifyButton, false);
      if (message.payload.ok) {
        setStatus('Settings verified against /models.', 'success');
      } else {
        const detail = message.payload.error ?? 'Unknown error';
        setStatus(`Verification failed: ${detail}`, 'error');
      }
      break;
    }
    case 'GENERATION_SUCCESS': {
      toggleLoading(generateButton, false);
      setStatus('Section generated for desktop and mobile.', 'success');
      break;
    }
    case 'GENERATION_ERROR': {
      toggleLoading(generateButton, false);
      setStatus(`Generation failed: ${message.payload.message}`, 'error');
      break;
    }
    case 'PATCH_SUCCESS': {
      toggleLoading(editButton, false);
      setStatus('Patch applied successfully.', 'success');
      break;
    }
    case 'PATCH_ERROR': {
      toggleLoading(editButton, false);
      setStatus(`Patch failed: ${message.payload.message}`, 'error');
      break;
    }
    default:
      break;
  }
};

// Attempt to hydrate from localStorage first, then ask plugin for stored settings
applySettingsToInputs(readUiSettings());
sendMessage({ type: 'REQUEST_SETTINGS' });
