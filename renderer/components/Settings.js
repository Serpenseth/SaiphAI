import {
  StringUtils,
  DomQuery,
} from '../utility/utilities.js';

import { ChatPanel } from '../components/ChatPanel.js';

const SettingsModal = {
  ui() {
    return `
      <div id='settings-content' class='modal-content-settings'>
        <br>
        <div style='display: flex; flex-direction: row; width: 100%; pointer-events: auto;'>
          <h1 style='margin-left: 3rem;'>Settings</h1>
          <buttton id='close-settings-modal' class='close-modal'>
            X
          </button>
        </div>
        <br><br>

        <div id='ollama-login' class='settings-conts'>
          <div style='display: flex; flex-direction: row; width: 17%'>
            <h3 class='settings-option-title'>Ollama</h3>
            <p id='ollama-selected-badge' class='settings-selected-badge' style='display: none;'>Selected</p>
          </div>
          ${this._createOllamaLogin()}
          <br>
          ${this._createOllamaModelDownload()}
        </div>

        <p style='margin-top: 0.15rem;'></p>

        <div id='openai-login' class='settings-conts'>
          <div style='display: flex; flex-direction: row; width: 17%'>
            <h3 class='settings-option-title'>OpenAI</h3>
            <p id='openai-selected-badge' class='settings-selected-badge' style='display: none;'>Selected</p>
          </div>
          ${this._createOpenAiLogin()}
        </div>
      </div>
    `;
  },

  _createOllamaLogin() {
    return  `
      <ul class='settings-options'>
        <div id='ollama-login' class='settings-api-key-container'>
          <p id='ollama-login-text' class="settings-option-second-text"></p><br>
          <button id="ollama-settings-login" class="btn btn-secondary settings-button"' style='display: none'>Login</button>
          <button id="select-ollama-settings" class="btn btn-secondary settings-button">Switch to OpenAI</button>
        </div>
      </ul>
    `;
  },

  _createOllamaModelDownload() {
    return `
      <div id='download-model-settings' style='border-top: 1px solid rgba(73, 92, 184, 0.075); flex-direction: column'>
        <p style='margin-top: 1rem; margin-left: 0'>Download Ollama model</p>
        <div style='display: flex; flex-direction: row; width: 100%; margin-top: 0.5rem'>
          <p class='settings-option-second-text' style='margin-top: 0.25rem; margin-left: 0;' >Ollama model to download:</p>
          <input id="settings-model-to-pull" class="settings-input settings-dl-model" placeholder='e.g mistral-medium-3.5:latest'></input>
          <button id='dl-ollama-model-settings' class='btn btn-secondary settings-download-model'>
            <img width='24' height='24' src="../assets/download-button.png">
          </button>
          <button id='abort-ollama-model-dl-settings' class='btn btn-secondary' style='display: none; margin-left: 2.5rem; padding: 0.25rem'>Abort download</button>
        </div>

        <div id='download-model-div' style='display: flex; flex-direction: row; width: 100%;'>
          <p id='model-dl-settings-err' class='settings-error-msg-bubble' style='display: none'></p>
          <p id="dl-text-settings" style="margin-top: 0.75rem; display: none"><strong>Downloading...</strong></p>
          <p id="ollama-settings-dl-progress-text"  style="margin-top: 0.75rem; margin-left: 1rem; style='display: none"></p>
        </div>
      </div>
    `;
  },

  _createOpenAiLogin() {
    return `
      <ul class='settings-options'>
        <p id='enter-openai-key-text' class="settings-option-second-text">Enter your OpenAI API key to use OpenAI models</p>
        <div class='settings-api-key-container' style='margin-top: 4rem'>
          <p id='api-key-text' style='margin-right: 12px; margin-top: 3px;'> API key:</p>
          <input id="openai-acc-settings" class="settings-input" placeholder="sk-proj-..."></input>
          <button id="verify-openai-key-settings" class="btn btn-secondary settings-button" style='margin-right: 1.15rem'>Verify</button>
          <div id='spinner-settings' class='settings-spinner' style='display: none;'></div>
          <p id='openai-login-text' class="settings-option-second-text"></p><br>
          <button id="select-openai-settings" class="btn btn-secondary settings-button">Switch to Ollama</button>
        </div>
        <p id='open-ai-settings-err' class='settings-error-msg-bubble'></p>
      </ul>
    `;
  },
}

const Config = {
  async get() {
    return await window.electronAPI.readConfigFile();
  },

  async writeToConfig(data) {
    await window.electronAPI.writeToConfigFile(data);
  },
}

/* TODO: Feature
 * Download button handler that attaches only when ollama is selected.
 * If Ollama is not selected, destroy (via abort) the handler to free memory
 */

const AiBackend = {
  async getOpenAiModels() {
    return window.electronAPI.getAllOpenAiModels();
  },

  async isKeyValid(apiKey) {
    return window.electronAPI.isOpenAiApiKeyValid(apiKey);
  },

  async getOllamaModels() {
    return window.electronAPI.getOllamaModels();
  },
}

const EnvHandler = {
  async isOpenAiEnvKeyEmpty() {
    return window.electronAPI.isKeyEmpty('OPENAI_KEY');
  },

  async writeToEnv(envKey, key) {
    window.electronAPI.writeEnvKey(envKey, key);
  },
}

const DownloadModelManager = {
  async downloadModel(modelName) {
    return window.electronAPI.downloadOllamaModel(modelName);
  },

  async abortDownload() {
    await window.electronAPI.abortModelDownload();
  },
}

const Ui = {
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

  showDownloadModelButton(state) {
    DomQuery.showElement('dl-ollama-model-settings', state);
  },

  hideDownloadElements(elements) {
    elements.forEach(el => DomQuery.showElement(el, false));
  },
}

const DownloadUiState = {
  set(state, errorText=null) {
    if (state === 'downloading') {
      Ui.updateProgressText('0%');
      Ui.showDownloadText(true);
      Ui.showAbortButton(true);
      Ui.showDownloadModelButton(false);
    }

    else if (state === 'error') {
      Ui.hideProgressText();
      Ui.showErrorMessage(errorText);
      Ui.showDownloadText(false);
      Ui.showAbortButton(false);
      Ui.showDownloadModelButton(true);
    }

    else if (state === 'aborted') {
      Ui.hideProgressText();
      Ui.showDownloadText(true);
      Ui.showAbortButton(true);
      Ui.showDownloadModelButton(false);
    }

    else if (state === 'success') {
      Ui.hideProgressText();
      Ui.updateProgressText("Download complete");
      DomQuery.showElement('download-model-div', false);
    }
  },
}

const DownloadProgressHandler = {
  progressHandler: null,
  isInit: false,

  setupHandler() {
    if (!this.isInit) {
      DownloadProgressHandler.progressHandler = (data) => {
        DownloadProgressHandler.downloadProgress(data);
      }

      window.electronAPI.onDLModelProgress(DownloadProgressHandler.progressHandler);
      this.isInit = true;
    }
  },

  downloadProgress(data) {
    if (data.percent !== 100)
      Ui.updateProgressText(`${data.percent}%`);

    else
      Ui.updateProgressText("Verifying SHA digest...");
  },

  destroy() {
    if (this.isInit) {
      window.electronAPI.removeDownloadProgress(DownloadProgressHandler.progressHandler);
    }
    this.isInit = false;
  }
}

const ModelDownloadManager = {
  async downloadModel(modelName) {
    try {
      DownloadUiState.set('downloading');

      const result = await DownloadModelManager.downloadModel(modelName);
      result.success
        ? DownloadUiState.set('success')
        : DownloadUiState.set('error', result.error);
    }
    catch (e) {
      DownloadUiState.set('error', e.message);
    }
  },
}

const OllamaHandler = {
  async isLoggedInToOllama() {
    return await window.electronAPI.isLoggedInToOllama();
  },

  async login() {
    const { stdout, stderr } = await window.electronAPI.launchProcess('ollama', ['login']);

    if (String(stderr).includes('ENOENT')) {
      return { loginMessage: null, loginError: 'Ollama is not installed' }
    }

    if (stderr) {
      return { loginMessage: null, loginError: String(stderr) }
    }

    return { loginMessage: stdout, loginError: null }
  },

  async isOllamaInstalled() {
    const { stderr } = await window.electronAPI.launchProcess('ollama', ['help']);
    return stderr ? false : true;
  },
}

const OllamaInstalled = {
  async handle() {
    const ollamaInstalled = await OllamaHandler.isOllamaInstalled();

    if (!ollamaInstalled) {
      DomQuery.updateText('ollama-login-text', 'Ollama is not installed');
    }

    else {
      const isLoggedIn = await OllamaHandler.isLoggedInToOllama();

      if (!isLoggedIn) {
        DomQuery.updateText('ollama-login-text', 'Login to Ollama to use cloud models');
        DomQuery.showElement('ollama-settings-login', true);
      }
      else {
        const loggedInMsg = 'You are currently logged in to your Ollama account ✔️';
        DomQuery.updateText('ollama-login-text', loggedInMsg);
        DomQuery.showElement('ollama-settings-login', false);
      }
    }
  },
}

const OllamaLogin = {
  async handle() {
    const { loginMessage, loginError } = await OllamaHandler.login();

    if (loginError) {
      DomQuery.updateText('ollama-login-text', loginError);
    }

    else {
      let isLoggedIn;

      const timeout = setInterval(async () => {
        isLoggedIn = await OllamaHandler.isLoggedInToOllama();

        if (isLoggedIn) {
          const loggedInMsg = 'You are currently logged in to your Ollama account ✔️';
          DomQuery.updateText('ollama-login-text', loggedInMsg);
          DomQuery.showElement('ollama-settings-login', false);
          clearInterval(timeout);
          return;
        }
        else {
          isLoggedIn = null;
        }
      }, 2000);
    }
  },
}

const OpenAiHandler = {
  async login() {
    const inputField = DomQuery.getElement('openai-acc-settings');

    if (inputField.value === '')
      return;

    Ui.showOpenAiSpinner(true);

    const { success, errorMsg } = await KeyHandler.verifyKey(inputField.value);

    if (!success) {
      Ui.updateOpenAiErrMsg(errorMsg);
      Ui.showOpenAiSpinner(false);
    }

    else {
      EnvHandler.writeToEnv('OPENAI_KEY', inputField.value);
      Ui.removeOpenAiSpinner();
      Ui.showLoggedIntoOpenAI();
      DomQuery.showElement('select-openai-settings', true);
      //DomQuery.getElement('select-ollama-settings').disabled = false;
    }
  },
}

const OpenAiLogin = {
  async handle() {
    const isEmpty = await EnvHandler.isOpenAiEnvKeyEmpty();

    if (!isEmpty) {
      Ui.removeOpenAiSpinner()
      Ui.showLoggedIntoOpenAI();
    }
  },
}

const HashUtil = {
  async createHash(input) {
    return window.electronAPI.createHash(input);
  },
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
}

const KeyHandler = {
  async verifyKey(key) {
    const hashedKey = await HashUtil.createHash(key);

    if (KeyCacheHandler.shouldSkipVerification(hashedKey)) {
      return { success: false, errorMsg: KeyCacheHandler.prevErrorMsg };
    }

    try {
      const result = await AiBackend.isKeyValid(key);

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
}

const CloseSettingsHandler = {
  handleEscClose(e) {
    if (e.key === 'Escape')
      Ui.show(false)
  },

  handleCloseButton() {
    Ui.show(false);
  },
}

const ModelsObject = {
  handle(modelObject) {
    const modelNames = [];
    modelObject.forEach(({ name }) => modelNames.push(name));

    return modelNames;
  },
}

const OpenAiModels = {
  cached: [],
  excludedTags: [
    'embedding', 'audio', 'image',
    'transcribe', 'whisper', 'tts',
    'sora', 'search', 'babbage',
    'translate', 'realtime'
  ],

  handle(models) {
    return models.filter(m => {
      return !this.excludedTags.some(e => m.id.toLowerCase().includes(e));
    })
    .map(m => { return m.id });
  },
}

const SelectedHandler = {
  async handleSelection() {
    try{
      const isEmpty = await EnvHandler.isOpenAiEnvKeyEmpty();
      const ollamaBadge = DomQuery.getElement('select-ollama-settings');
      const isOllamaSelected = ollamaBadge.disabled === true;
      let selected =  await Config.get();
      selected = selected.selectedModel;

      Ui.setSelectedBadge(isOllamaSelected, !isEmpty);
      Ui.showOllamaDownloadSection(isOllamaSelected);
      Ui.setBorderForSelectedFramework(isOllamaSelected);

      if (isOllamaSelected) {
        // Attach download-related events only when Ollama is selected
        DownloadProgressHandler.setupHandler();
        // Get models
        let models = await AiBackend.getOllamaModels();
        models = ModelsObject.handle(models.models);

        Config.writeToConfig({
          modelFramework:  'ollama',
          ollamaModels: models,
        });

        ChatPanel.populateModelSelector({
          modelFramework: 'ollama',
          ollamaModels: models,
          selectedModel: selected
        });
      }

      else {
        /* Remove download-related events,
        * since OpenAI doesn't use them */
        DownloadProgressHandler.destroy();

        if (!isEmpty) {
          let models;
          if (OpenAiModels.cached.length === 0) {
            models = await AiBackend.getOpenAiModels();
            models = OpenAiModels.handle(models);
            OpenAiModels.cached = models;
          }

          Config.writeToConfig({
            modelFramework:  'openai',
            openaiModels: models || OpenAiModels.cached,
          });

          ChatPanel.populateModelSelector({
            modelFramework: 'openai',
            openaiModels: models || OpenAiModels.cached,
            selectedModel: selected
          });
        }
      }
    }

    catch(e) {
      console.error(e);
    }
  },
}

const DownloadButtonHandler = {
  async handleDownloadButtonClick() {
    const inputField = DomQuery.getElement('settings-model-to-pull');
    const modelName = inputField.value;

    let userModels = await AiBackend.getOllamaModels();
    userModels = userModels.models;
    const userHasModel = userModels.some(model => {
      return model.name === modelName;
    });

    if (modelName.trim() !== '') {
      if (userHasModel) {
        Ui.showModelAlreadyInstalled(modelName);
        return;
      }

      ModelDownloadManager.downloadModel(modelName);
    }
  },
}

const AbortButtonHandler = {
  async handleAbort() {
    await DownloadModelManager.abortDownload();
    DownloadUiState.set('aborted');
  },
}

const EventHandler = {
  setupClickEvents(elems, fn) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);

      if (elem)
        elem.addEventListener('click', fn);
    });
  },

  setupKeyPressEvent(fn) {
    document.addEventListener('keydown', fn);
  },
}

const Settings = {
  eventSetup() {
    EventHandler.setupKeyPressEvent(
      (e) => CloseSettingsHandler.handleEscClose(e),
    );

    EventHandler.setupClickEvents([
      { id: 'ollama-settings-login', fn: () => OllamaLogin.handle() },
      { id: 'verify-openai-key-settings', fn: () => OpenAiHandler.login() },
      { id: 'select-ollama-settings', fn: () => SelectedHandler.handleSelection() },
      { id: 'select-openai-settings', fn: () => SelectedHandler.handleSelection() },
      { id: 'close-settings-modal', fn: () => CloseSettingsHandler.handleCloseButton() },
      { id: 'dl-ollama-model-settings', fn: () => DownloadButtonHandler.handleDownloadButtonClick() },
      { id: 'abort-ollama-model-dl-settings', fn: () => AbortButtonHandler.handleAbort() },
    ]);
  },

  async init(config) {
    Ui.build(SettingsModal.ui());

    Promise.all([
      OllamaInstalled.handle(),
      OpenAiLogin.handle()
    ]);

    const isOllama = config.modelFramework === 'ollama';
    const isEmpty = await EnvHandler.isOpenAiEnvKeyEmpty();

    Ui.setSelectedBadge(isOllama, !isEmpty);
    Ui.setBorderForSelectedFramework(isOllama);
    Ui.showOllamaDownloadSection(isOllama);

    if (isOllama) {
      DownloadProgressHandler.setupHandler();
    }

    this.eventSetup();
  },

  show(state) {
    Ui.show(state);
  },
}

export { Settings };
