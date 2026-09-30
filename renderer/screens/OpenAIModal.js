import { OllamaSuccess } from './OllamaSuccess.js';
import { FrameworkSelection } from './FrameworkSelection.js';

import { DomQuery } from '../utility/utilities.js';

const OpenAiBackend = {
  async getModels(apiKey) {
    return window.electronAPI.getAllOpenAiModels(apiKey);
  },

  async isKeyValid(apiKey) {
    return window.electronAPI.isOpenAiApiKeyValid(apiKey);
  }
}

const ConfigFile = {
  async create() {
    window.electronAPI.createConfigFile();
  },

  async saveModel(model) {
    window.electronAPI.writeToConfigFile({
      selectedModel: model,
      modelFramework: "openai",
    });
  },
}

const HashUtil = {
  async createHash(input) {
    return window.electronAPI.createHash(input);
  },
}

const OpenAiModalDOM = {
  ui() {
    return `
      <div id="login-openai" class="login-openai" style="content-visibility: hidden">
        <h1>OpenAI setup</h1>
        <div id='api-key-container'>
          <p class="subtitle">Enter your OpenAI API key</p>
          <p class="secondary-text" style="margin-top: -1rem">This key will be used to send prompts to OpenAI models</p>
          <div class="model-login">
            <p style="margin-bottom: 5px;"> API key:</p>
            <input id="openai-acc" class="input model-pull" placeholder="sk-proj-..." style="width: 512px"></input>
          </div>
          <p id="openai-apikey-error" class="download-error" style="display: none; margin-top: -3em; margin-bottom: 4em"></p>

          <div style="display: flex; flex-direction: column; margin-top: -3em; gap: 1rem;">
            <button id="verify-openai-key" class="btn btn-secondary modal-action-btn" style="display: none;">Verify</button>
            <p class="secondary-text" style="font-size: 0.85rem; margin-top: 0.25rem;">Can't find your OpenAI API key?</p>
            <a href="https://platform.openai.com/api-keys" target="_blank" style="margin-left: 3px; margin-top: -0.75rem;">Click here</a>
          </div>
        </div>

        <div id="loading-overlay-openai" class="loading-overlay" style="display: none;">
          <h1>Verfiying API key. Please wait...</h1>
          <p class="text-secondary">No api credits will be used</p>
          <div class="spinner"></div>
        </div>
        <div id='openai-stats-container' style="content-visibility: hidden">
          <p>OpenAI is ready to go. Below is a brief breakdown of OpenAI status:</p><br>
          <ul class="details openai-details">
            <li>✔️ Connected to OpenAI</li>
            <li id="openai-model-count"></li>
            <li>Default Model:
              <select  id="openai-model-select" class="details-modal-select">
                <option></option>
                </select>
            </li>
          </ul>
          <br>
          <p class="secondary-text">The Default model can be changed at any time via settings</p>
        </div>

        <div class="btn-bottom-container">
          <button id="close-openai-setup" class="btn btn-secondary modal-nav-button">Go back</button>
          <button id="continue-openai-setup" class="btn btn-primary modal-nav-button" style="display: none;">
            Continue
          </button>
        </div>
      </div>`;
  }
}

const NavigationHandler = {
  completeSetup() {
    OllamaSuccess.show('success', 'openai');
  },

  frameworkSelection() {
    FrameworkSelection.show();
  },
}

const Models = {
  selected: null,
  count: 0,
  excludedTags: [
    'embedding', 'audio', 'image',
    'transcribe', 'whisper', 'tts',
    'sora', 'search', 'babbage',
    'translate', 'realtime'
  ],
}

const Ui = {
  load(uiElem, htmlContent) {
    // Check if HTML has already been inserted
    if (DomQuery.getElement('login-openai')) {
      return;
    }

    DomQuery.insertHTML(uiElem, htmlContent);
  },

  show(loginOpenai) {
    DomQuery.toggleVisibility(loginOpenai, true);
  },

  hide(loginOpenai) {
    DomQuery.toggleVisibility(loginOpenai, false);
  },

  destroy(loginOpenai) {
    DomQuery.removeElement(loginOpenai);
  },

  showOverlay(overlayElement) {
    DomQuery.showElement(overlayElement, true);
  },

  hideOverlay(overlayElement) {
    DomQuery.showElement(overlayElement, false);
  },

  hideKeyInterface(apiKeyContainer) {
    DomQuery.showElement(apiKeyContainer, false);
  },

  showContinueButton(continueButton) {
    DomQuery.showElement(continueButton, true);
  },

  showVerifyButton(inputData) {
    const data = inputData.trim();

    data.length !== 0
      ? DomQuery.showElement('verify-openai-key', true)
      : DomQuery.showElement('verify-openai-key', false);
  },

  showApiKeyErrorMsg(message) {
    DomQuery.showElement('openai-apikey-error', true);
    DomQuery.updateText('openai-apikey-error', message);
    DomQuery.setBorder('openai-acc', '3px solid #C63D3D');
    DomQuery.showElement('verify-openai-key', false);

    setTimeout(() => {
      DomQuery.showElement('openai-apikey-error', false);
      DomQuery.setBorder('openai-acc', '');
      DomQuery.showElement('verify-openai-key', true);
    }, 2000);
  },

  showModelCount(modelCountElement) {
    const el = DomQuery.getElement(modelCountElement);
    el.textContent = `Models Available: ${Models.count}`;
  },

  populateModels(models, modelSelectorElement) {
    const modelSelector = DomQuery.getElement(modelSelectorElement);

    const options = models
      .filter(m => {
        !Models.excludedTags.some(e => m.id.toLowerCase().includes(e));
      })
      .map(m => {
        const s = document.createElement('option');
        s.value = m.id;
        s.textContent = m.id;

        if (m.id === Models.selected)
          s.selected = true;

        return s;
      });

    modelSelector.replaceChildren(...options);
    Models.count = options.length;

    if (!Models.selected)
      Models.selected = models[0].id;

    else
      Models.selected = modelSelector.value;
  },

}

const Controller = {
  abortController: new AbortController(),

  abort() {
    this.abortController.abort();
  },
}

const EventHandler = {
  isInit: false,

  setupEvents(elems, fn, abortSignal) {
    if (!this.isInit) {
      elems.forEach(({ id, fn }) => {
        const elem = DomQuery.getElement(id);

        if (elem)
          elem.addEventListener('click', fn, { signal: abortSignal });
      });
      this.isInit = true;
    }
  },

  setupInputEvent(element, fn, abortSignal) {
    if (!this.isInit) {
      const el = DomQuery.getElement(element);

      if (el) {
        el.addEventListener('input', fn, { signal: abortSignal });
      }
    }
  },

  destroy(abortSignal) {
    abortSignal.abort();
    this.isInit = false;
  }
}

const KeyCacheHandler = {
  checkedKeys: [],
  prevErrorMsg: null,

  shouldSkipVerification(hashedKey) {
    if (!this.prevErrorMsg)
      return false;

    const hadNetworkError = this.prevErrorMsg.includes("fetch");

    if (this.checkedKeys.includes(hashedKey)) {
      return !hadNetworkError;
    }

    return false;
  },

  recordFailure(hashedKey, errorMsg) {
    this.prevErrorMsg = errorMsg;
    this.checkedKeys.push(hashedKey);
  },

  clearCache() {
    this.checkedKeys = [];
    this.prevErrorMsg = null;
  }
};

const KeyHandler = {
  async verifyKey(key) {
    const hashedKey = await HashUtil.createHash(key);

    if (KeyCacheHandler.shouldSkipVerification(hashedKey)) {
      return { success: false, errorMsg: KeyCacheHandler.prevErrorMsg };
    }

    try {
      const result = await OpenAiBackend.isKeyValid(key);

      if (!result.valid) {
        KeyCacheHandler.recordFailure(hashedKey, result.message);
        return { success: false, errorMsg: result.message };
      }

      KeyCacheHandler.clearCache();
      return { success: true, errorMsg: null };
    }
    catch (err) {
      throw err;
    }
  }
};

const OpenAiModaI = {
  registerEventListeners() {
    EventHandler.setupInputEvent(
      'openai-acc',
      (e) => Ui.showVerifyButton(e.target.value),
      Controller.abortController.signal
    );

    EventHandler.setupEvents([
      { id: 'verify-openai-key', fn: () => this.verifyKeyButton() },
      { id: 'close-openai-setup', fn: () => this.goBack() },
      { id: 'continue-openai-setup', fn: () => this.completeOpenaiSetup() },
    ], Controller.abortController.signal);
  },

  show() {
    Ui.load('modal-content', OpenAiModalDOM.ui());
    Ui.show('login-openai');
    this.registerEventListeners();
  },

  hide() {
    Ui.hide('login-openai');
  },

  destroy() {
    Controller.abort();
    Ui.destroy('login-openai');
  },

  async verifyKeyButton() {
    Ui.showOverlay('loading-overlay-openai');
    let key = DomQuery.getElement('openai-acc').value;

    try {
      const result = await KeyHandler.verifyKey(key);

      if (result.success) {
        const allModels = await OpenAiBackend.getModels(key);
        Ui.populateModels(allModels, 'openai-model-select');
        Ui.showModelCount('openai-model-count');
        Ui.show('openai-stats-container');
        Ui.showContinueButton('continue-openai-setup');
        Ui.hideKeyInterface('api-key-container');
        Ui.hideOverlay('loading-overlay-openai');
      }
      else {
        key = null;
        Ui.showApiKeyErrorMsg(result.errorMsg);
        Ui.hideOverlay('loading-overlay-openai');
      }
    }
    catch(err) {
      key = null;
      Ui.showApiKeyErrorMsg(err);
      Ui.hideOverlay('loading-overlay-openai');
    }
  },

  goBack() {
    NavigationHandler.frameworkSelection();
    this.hide();
  },

  async completeOpenaiSetup() {
    await ConfigFile.create();
    await ConfigFile.saveModel(Models.selected);

    NavigationHandler.completeSetup();
    this.destroy();
  },
}

export { OpenAiModaI };

