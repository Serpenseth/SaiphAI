import { DomQuery } from '../../utility/utilities.js';

const SettingsUiHelper = {
  showOpenAiSpinner(state) {
    DomQuery.showElement('spinner-settings', state);
    DomQuery.showElement('verify-openai-key-settings', !state);
    DomQuery.showElement('open-ai-settings-err', !state);
  },

  showLoggedIntoOpenAI() {
    const loggedInMsg = 'You are currently logged in to your Openai account ✔️';
    DomQuery.updateText('openai-login-text', loggedInMsg);
  },

  removeOpenAiSpinner() {
    DomQuery.removeElement('openai-acc-settings');
    DomQuery.removeElement('spinner-settings');
    DomQuery.removeElement('api-key-text');
    DomQuery.removeElement('verify-openai-key-settings');
    DomQuery.updateText('enter-openai-key-text', '');
    DomQuery.getElement('enter-openai-key-text').style.marginTop = '-1rem';
  },

  updateOpenAiErrMsg(errorMsg) {
    DomQuery.updateText('open-ai-settings-err', errorMsg);
  },

  build(htmlTemplate) {
    DomQuery.insertHTML('settings-modal', htmlTemplate);
  },

  show(state) {
    DomQuery.toggleVisibility('settings-modal', state);
  },

  setSelectedBadge(isOllamaSelected, isLoggedInToOpenAi) {
    const ollamaBadge = 'ollama-selected-badge'
    const openaiBadge = 'openai-selected-badge'
    const ollamaSelectBtn = 'select-ollama-settings'
    const openaiSelectBtn = 'select-openai-settings'

    if (isOllamaSelected) {
      DomQuery.showElement(ollamaBadge, true);
      DomQuery.showElement(openaiBadge, false);
      DomQuery.getElement(openaiSelectBtn).disabled = true;
      DomQuery.getElement(ollamaSelectBtn).disabled = false;

      if (!isLoggedInToOpenAi) {
        DomQuery.showElement(ollamaSelectBtn, false);
      }
    }

    else {
      DomQuery.showElement(ollamaBadge, false);
      DomQuery.showElement(openaiBadge, true);
      DomQuery.getElement(openaiSelectBtn).disabled = false;
      DomQuery.getElement(ollamaSelectBtn).disabled = true;

      if (!isLoggedInToOpenAi) {
        DomQuery.showElement(openaiSelectBtn, false);
      }
    }
  },

  setBorderForSelectedFramework(isOllamaSelected) {
    const borderStyle = '1px solid rgba(173, 197, 220, 0.15)';

    if (isOllamaSelected) {
      DomQuery.setBorder('ollama-login', borderStyle);
      DomQuery.setBorder('openai-login', '');
    }

    else {
      DomQuery.setBorder('openai-login', borderStyle);
      DomQuery.setBorder('ollama-login', '');
    }
  },

  showOllamaDownloadSection(state) {
    DomQuery.showElement('download-model-settings', state);
  },

  showErrorMessage(error) {
    const dlErr = 'model-dl-settings-err';
    const modelInput = 'settings-model-to-pull';
    DomQuery.showElement(dlErr, true);
    DomQuery.updateText(dlErr, error);
    DomQuery.setBorder(modelInput, '2px solid #C63D3D');

    setTimeout(() => {
      DomQuery.showElement(dlErr, false);
      DomQuery.setBorder(modelInput, '');
    }, 2500);
  },

  showModelAlreadyInstalled(modelName) {
    DomQuery.updateText('dl-text-settings', `Model ${modelName} already installed`);
    DomQuery.showElement('dl-text-settings', true);

    setTimeout(() => {
      DomQuery.showElement('dl-text-settings', false);
      DomQuery.updateInnerHTML('dl-text-settings', '<strong>Downloading...</strong>');
    }, 2500);
  },

  showDownloadText(state) {
    DomQuery.showElement('dl-text-settings', state);
  },

  updateProgressText(newText) {
    DomQuery.updateText('ollama-settings-dl-progress-text', newText);
  },

  hideProgressText() {
    DomQuery.showElement('ollama-settings-dl-progress-text', false);
  },

  showAbortButton(state) {
    DomQuery.showElement('abort-ollama-model-dl-settings', state);
  },

  showDownloadModelDiv(state) {
    DomQuery.showElement('download-model-div', state);
  },

  showDownloadModelButton(state) {
    DomQuery.showElement('dl-ollama-model-settings', state);
  },

  hideDownloadElements(elements) {
    elements.forEach(el => DomQuery.showElement(el, false));
  },
}

export { SettingsUiHelper };
