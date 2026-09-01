import { createSuccessScreen } from './OllamaSuccess.js';

const Backend = {
  async isKeyValid(apiKey) {
    return await window.electronAPI.isOpenAiApiKeyValid(apiKey);
  },

  async getAllOpenAiModels(apiKey) {
    return await window.electronAPI.getAllOpenAiModels(apiKey);
  },

  async saveSelectedModel(model) {
    await window.electronAPI.createConfigFile();
    await window.electronAPI.writeToConfigFile({ selectedModel: model });
  },

  async saveOpenaiAsFramework() {
    await window.electronAPI.writeToConfigFile({ modelFramework: "openai" });
  },
}

const Utility = {
  async createHash(input) {
    return await window.electronAPI.createHash(input);
  },
}

class OpenAiModalUI {
  constructor() {
    this.openAiModal = document.getElementById('login-openai');
    this.elements = {
      loadingOverlay: document.getElementById("loading-overlay-openai"),
      openaiStats: document.getElementById("openai-stats-container"),
      apiKeyContainer: document.getElementById("api-key-container"),
      apiKeyInput: document.getElementById("openai-acc"),
      verifyKeyButton: document.getElementById("verify-openai-key"),
      errorMessage: document.getElementById("openai-apikey-error"),
      modelCount: document.getElementById("openai-model-count"),
      defaultModelSelector: document.getElementById("openai-model-select"),
      frameworkSelectButton: document.getElementById("close-openai-setup"),
      completeSetup: document.getElementById("continue-openai-setup"),
    }
    this.selectedModel = null;
  }

  _showModal(modal) {
    modal.style.contentVisibility = '';
    modal.style.opacity = 1;
    modal.style.visibility = "visible";
  }

  show() {
    this._showModal(this.openAiModal);
  }

  hide() {
    this.openAiModal.style.contentVisibility = 'hidden';
  }

  remove() {
    this.openAiModal.remove();
  }

  showOverlay() {
    this.elements.loadingOverlay.removeAttribute('style');
  }

  hideOverlay() {
    this.elements.loadingOverlay.style.display = 'none';
  }

  hideKeyInterface() {
    this.elements.apiKeyContainer.style.contentVisibility = 'hidden';
  }

  async showError(message) {
    const { apiKeyInput, verifyKeyButton, errorMessage } = this.elements;
    let wait = () => new Promise(resolve => setTimeout(resolve, 2000));

    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    apiKeyInput.style.border = '3px solid #C63D3D';
    verifyKeyButton.style.display = 'none';

    await wait();
    errorMessage.style.display = 'none';
    apiKeyInput.style.border = '';
    verifyKeyButton.style.display = '';
    wait = null;
  }

  showVerifyButton(showButton) {
    showButton
      ? this.elements.verifyKeyButton.style.display = 'block'
      : this.elements.verifyKeyButton.style.display = 'none';
  }

  hideVerifyButton() {
    this.ui.elements.style.display = 'none';
  }

  showModelCount(models) {
    const { modelCount } = this.elements;
    modelCount.textContent = `Models Available: ${models.length}`;
  }

  showAvailableModels(models) {
    const options = models.map(m => {
      const s = document.createElement('option');
      s.value = m.id;
      s.textContent = m.id;

      if (m.id === this.selectedModel)
        s.selected = true;

      return s;
    });
    this.elements.defaultModelSelector.replaceChildren(...options);

    if (!this.selectedModel)
      this.selectedModel = models[0].id;

    else
      this.selectedModel = this.elements.defaultModelSelector.value;
  }

  showOpenaiStats(data) {
    const { openaiStats, apiKeyContainer, completeSetup } = this.elements;

    this._showModal(openaiStats);
    this.showAvailableModels(data);
    this.showModelCount(data);

    apiKeyContainer.style.contentVisibility = 'hidden';
    completeSetup.removeAttribute('style');
  }
}

const NavigationHandler = {
  async completeSetup() {
    const successModal = createSuccessScreen('success', 'openAI');
    successModal.show();
  },

  async frameworkSelection() {
    const { createFrameworkSelect } = await import('./FrameworkSelection.js');
    const result = createFrameworkSelect();
    result.show();
  },
}

class EventHandler {
  constructor(ui, coordinator) {
    this.ui = ui;
    this.coordinator = coordinator;
    this.controller = new AbortController();
    this.isAlreadyInit = false;
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler, { signal: this.controller.signal });
  }

  init() {
    this.addListener(this.ui.elements.apiKeyInput, 'input', (e) => {
      this.coordinator.showVerifyButton(e.target.value);
    });

    this.addListener(this.ui.elements.verifyKeyButton, 'click', () => {
      this.coordinator.verifyApiKey();
    });

    this.addListener(this.ui.elements.frameworkSelectButton, 'click', () => {
      this.coordinator.frameworkSelection();
    });

    this.addListener(this.ui.elements.completeSetup, 'click', () => {
      this.coordinator.completeSetup();
    });
  }

  cleanup() {
    this.controller.abort();
    this.isAlreadyInit = true;
  }
}

class KeyHandler {
  constructor(ui, backend) {
    this.ui = ui;
    this.service = backend;
    this.alreadyCheckedKeys = [];
    this.prevErrorMessage = null;
  }

  async verifyKey(key) {
    const hashedKey = await Utility.createHash(key);

    if (this.prevErrorMessage) {
      const hadNetworkError = this.prevErrorMessage.includes("fetch");

      if (this.alreadyCheckedKeys.includes(hashedKey)) {
        if (hadNetworkError)
          this.alreadyCheckedKeys[hashedKey] = null;

        else {
          this.ui.showError(this.prevErrorMessage);
          return;
        }
      }
    }

    this.ui.showOverlay();

    const result = await this.service.isKeyValid(key);

    if (!result.valid) {
      this.ui.hideOverlay();
      this.prevErrorMessage = result.message
      this.ui.showError(this.prevErrorMessage);
      this.alreadyCheckedKeys.push(hashedKey);
    }

    else {
      const allModels = await this.service.getAllOpenAiModels(key);

      this.alreadyCheckedKeys = null;
      this.prevErrorMessage = null;
      this.ui.hideOverlay();
      this.ui.showOpenaiStats(allModels);
    }
  }
}

class OpenAiModal {
  constructor(backend, ui, navigationHandler, keyHandler, eventHandler) {
    this.service = backend;
    this.ui = ui;
    this.navigation = navigationHandler;
    this.keyHandler = keyHandler;
    this.eventHandler = eventHandler;
  }

  show() {
    this.ui.show();

    if (!this.eventHandler.isAlreadyInit) {
      this.eventHandler.init();
      this.eventHandler.isAlreadyInit = true;
    }
  }

  destroy() {
    this.ui.elements.apiKeyInput.value = null;
    this.eventHandler.cleanup();

    this.service = null;
    this.ui = null;
    this.coordinator = null;
    this.eventHandler = null;
  }

  showVerifyButton(inputValue) {
    const shouldShow = inputValue.trim() !== '';
    this.ui.showVerifyButton(shouldShow);
  }

  async verifyApiKey() {
    let key = this.ui.elements.apiKeyInput.value;
    await this.keyHandler.verifyKey(key);

    key = null;
  }

  completeSetup() {
    const { defaultModelSelector } = this.ui.elements;

    this.service.saveSelectedModel(defaultModelSelector.value);
    this.service.saveOpenaiAsFramework();
    this.ui.remove();
    this.destroy();
    this.navigation.completeSetup();
  }

  frameworkSelection() {
    this.ui.hide();
    this.destroy();
    this.navigation.frameworkSelection();
  }
}


export function createOpenAiScreen() {
  const ui = new OpenAiModalUI();
  const eventHandler = new EventHandler(ui, null);
  const keyHandler = new KeyHandler(ui, Backend);

  const openAiModal = new OpenAiModal(
    Backend,
    ui,
    NavigationHandler,
    keyHandler,
    eventHandler,
  );

  eventHandler.coordinator = openAiModal;

  return openAiModal;
}

