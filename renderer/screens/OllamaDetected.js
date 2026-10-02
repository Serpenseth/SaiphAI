import { OllamaSuccess } from './OllamaSuccess.js';
import { FrameworkSelection } from './FrameworkSelection.js';

import { DomQuery } from '../utility/utilities.js';

const OllamaBackend = {
  async checkConnection() {
    return window.electronAPI.checkOllama();
  },

  async downloadModel(modelName) {
    return window.electronAPI.downloadOllamaModel(modelName);
  },

  abortDownload() {
    window.electronAPI.abortModelDownload();
  },
}

const ConfigFile = {
  async create() {
    window.electronAPI.createConfigFile();
  },

  async saveToConfig(data) {
    await window.electronAPI.writeToConfigFile({
      selectedModel: data.selectedModel,
      ollamaModelCount: data.ollamaModelCount,
      modelFramework: "ollama"
    });
  }
}

const OllamaDetectedModal = {
  ui() {
    return `
      <div id="ollama-detected" class="intro-text" style="content-visibility: hidden;">
        <!-- Select default model -->
        <div id="ollama-stats-container" class="intro-text" style="content-visibility: hidden;">
          <h1> Ollama Setup</h1>
          <p>Ollama is installed. Below is a brief breakdown of Ollama status:</p><br>

          <ul class="details">
            <li id="ollama-connection">Connection:</li>
            <li id="model-count">Total Models Found:</li>
            <li id="models-installed">Default Model:
              <select id="details-modal-select" class="details-modal-select">
                <option></option>
                </select>
            </li>
          </ul>
          <br>
          <p class="secondary-text">The Default model can be changed at any time via settings</p>

          <div class="btn-bottom-container">
            <button id="close-ollama-details" class="btn btn-secondary modal-nav-button">Choose another AI framework</button>
            <button id="ollama-detected-complete" class="btn btn-primary modal-nav-button">Complete setup</button>
          </div>
        </div>

        <!-- No models found -->
        <div id="no-models" class="intro-text" style="content-visibility: hidden">
          <h1> Ollama Setup</h1>
          <h3 style="margin-bottom: -0.5rem;">Ollama is installed, but no models were found</h3>
          <div style="margin-bottom: 16px; padding: 1.25em; margin-top: 0.5rem;">
            <p style="color: #eff1f3; padding-bottom: 1.5em;">To install an Ollama model, follow the steps below:</p>
            <ol type="1">
              <li>Select a model from the
                <a id="ollama-link" href="https://ollama.com/library?sort=newest" target="_blank" style="margin-left: 2px;">Ollama models page</a>
              </li>
              <li>Paste the model's name:
                <input id="ollama-model-to-pull" class="input model-pull" placeholder="example: mistral-medium-3.5:latest"></input>
              </li>
              <li id='press-download-to-start' style='display: none;'>Press the "Download Model" button below to start the download</li>
            </ol>

            <p id="download-error" class="download-error" style="display: none; margin-top: 0.5rem; margin-bottom: 0.5rem;"></p>

            <button id="dl-ollama-model" class="btn btn-secondary" style="display: none">Download Model</button>
            <div style='margin-top: 1.5em;'>
              <p id="dl-text" style="display: none; padding-top: 0; color: #eff1f3; font-size: 1.2rem;"><strong>Downloading...</strong></p>
              <p id="ollama-dl-progress-text"></p>
            </div>
            <button id='abort-ollama-model-dl' class="btn btn-secondary modal-nav-button" style='display: none;'>
              Cancel download
            </button>
          </div>

          <div class="btn-bottom-container">
            <button id="close-ollama-model-dl" class="btn btn-primary modal-nav-button">Choose another AI framework</button>
            <button id="verify-ollama-after-model-dl" class="btn btn-primary modal-nav-button" style="display: none">Continue</button>
          </div>
        </div>
      </div>`
  }
};

const NavigationHandler = {
  completeSetup(isSuccess, prevModal) {
    isSuccess
      ? OllamaSuccess.show('success', 'Ollama')
      : OllamaSuccess.show('failed', null, prevModal);
  },

  frameworkSelection() {
    FrameworkSelection.show();
  },
}

const Models = {
  selected: null,
  count: 0,
}

const ModelSelector = {
  populate(models, selectedModel) {
    const options = models
      .filter(m => {
        return !m.name.toLowerCase().includes('embed');
      })
      .map(m => {
        const s = document.createElement('option');
        s.value = m.name;
        s.textContent = m.name;

        if (m.name === selectedModel)
          s.selected = true;

        return s;
      });

    DomQuery.getElement('details-modal-select').replaceChildren(...options);
    Models.count = options.length;
  },
}

const Ui = {
  load(uiElem, htmlContent) {
    // Check if HTML has already been inserted
    if (DomQuery.getElement('ollama-detected')) {
      return;
    }

    DomQuery.insertHTML(uiElem, htmlContent);
  },

  show(ollamaDetected) {
    DomQuery.toggleVisibility(ollamaDetected, true);
  },

  hide(ollamaDetected) {
    DomQuery.toggleVisibility(ollamaDetected, false);
  },

  showDownloadText(state) {
    DomQuery.showElement('dl-text', state);
  },

  removeProgressText() {
    DomQuery.removeElement('ollama-dl-progress-text');
  },

  updateProgressText(newText) {
    DomQuery.updateText('ollama-dl-progress-text', newText);
  },

  showAbortButton(state) {
    DomQuery.showElement('abort-ollama-model-dl', state);
  },

  showDownloadModelButton(state) {
    DomQuery.showElement('dl-ollama-model', state);
  },

  showFrameworkSelectButton(state) {
    DomQuery.showElement('close-ollama-model-dl', state);
  },

  showCompleteButton(state) {
    DomQuery.showElement('verify-ollama-after-model-dl', state);
  },

  showOllamaStatsContainer() {
    DomQuery.toggleVisibility('ollama-stats-container', true);
  },

  showNoModelsContainer() {
    DomQuery.toggleVisibility('no-models', true);
  },

  showDownloadButton(inputData) {
    const data = inputData.trim();

    data.length !== 0
      ? DomQuery.showElement('dl-ollama-model', true)
      : DomQuery.showElement('dl-ollama-model', false);
  },

  showErrorMessage(error) {
    const dlErr = 'download-error';
    const modelInput = 'ollama-model-to-pull';
    DomQuery.showElement(dlErr, true);
    DomQuery.updateText(dlErr, error);
    DomQuery.setBorder(modelInput, '3px solid #C63D3D');
    //DomQuery.showElement('verify-openai-key', false);

    setTimeout(() => {
      DomQuery.showElement(dlErr, false);
      DomQuery.setBorder(modelInput, '');
      //DomQuery.showElement('verify-openai-key', true);
    }, 2500);
  },

  updateProgressText(text) {
    DomQuery.updateText('ollama-dl-progress-text', text);
  },

  hideProgressText() {
    DomQuery.showElement('ollama-dl-progress-text', false);
  },

  updateSuccessText(modelCount) {
    const connected = "Connection: ✔️ Connected to http://localhost:11434";
    const modelCountText = `Total Models Found: ${modelCount}`;

    DomQuery.updateText('ollama-connection', connected);
    DomQuery.updateText('model-count', modelCountText);
  },

  removeDownloadElements(elements) {
    elements.forEach(el => DomQuery.removeElement(el));
  },

  destroyModal(ollamaDetected) {
    DomQuery.removeElement(ollamaDetected);
  },
}

const DownloadProgressHandler = {
  progressHandler: null,

  setupHandler() {
    this.progressHandler = (data) => {
      this.downloadProgress(data);
    }

    window.electronAPI.onDLModelProgress(this.progressHandler);
  },

  downloadProgress(data) {
    if (data.percent !== 100)
      Ui.updateProgressText(`${data.percent}%`);

    else
      Ui.updateProgressText("Verifying SHA digest...");
  },
}

const DownloadUiState = {
  set(state, errorText=null) {
    if (state === 'downloading') {
      Ui.updateProgressText('0%');
      Ui.showDownloadText(true);
      Ui.showAbortButton(true);
      Ui.showDownloadModelButton(false);
      Ui.showFrameworkSelectButton(false);
    }

    else if (state === 'error') {
      Ui.hideProgressText();
      Ui.showErrorMessage(errorText);
      Ui.showDownloadText(false);
      Ui.showAbortButton(false);
      Ui.showDownloadModelButton(true);
      Ui.showFrameworkSelectButton(true);
    }

    else if (state === 'aborted') {
      Ui.hideProgress();
      Ui.showDownloadText(true);
      Ui.showAbortButton(true);
      Ui.showDownloadModelButton(false);
      Ui.showFrameworkSelectButton(false);
    }

    else if (state === 'success') {
      Ui.removeProgressText();
      Ui.updateProgressText("Download complete");
      Ui.showCompleteButton(true);
      Ui.removeDownloadElements([
        'dl-text',
        'ollama-dl-progress-text',
        'abort-ollama-model-dl',
        'download-error',
        'close-ollama-model-dl'
      ]);
    }
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

const ModelDownloadManager = {
  async downloadModel(modelName) {
    try {
      const isRunning = await OllamaBackend.checkConnection();

      if (!isRunning) {
        DownloadUiState.set('error', "Error: Ollama isn't running.");
        return;
      }

      DownloadUiState.set('downloading');

      const result = await OllamaBackend.downloadModel(modelName);
      result.success
        ? DownloadUiState.set('success')
        : DownloadUiState.set('error', result.error);
    }
    catch (e) {
      DownloadUiState.set('error', e.message);
    }
  },

  abort() {
    OllamaBackend.abortDownload();
    DownloadUiState.set('aborted');
  },

  downloadProgress(data) {
    DownloadProgressHandler.downloadProgress(data);
  },
}

const OllamaDetected = {
  registerEventListeners() {
    const inputField = 'ollama-model-to-pull';

    EventHandler.setupInputEvent(
      inputField,
      (e) => Ui.showDownloadButton(e.target.value),
      Controller.abortController.signal
    );

    EventHandler.setupEvents([
      { id: 'dl-ollama-model', fn: () =>
        ModelDownloadManager
          .downloadModel(DomQuery.getElement(inputField).value)
      },
      { id: 'abort-ollama-model-dl', fn: () => ModelDownloadManager.abort() },
      { id: 'close-ollama-model-dl', fn: () => this.handleReturn() },
      { id: 'verify-ollama-after-model-dl', fn: () => this.handleContinue() },
      { id: 'ollama-detected-complete', fn: () => this.handleContinue() },
    ], Controller.abortController.signal);
  },

  setup() {
    Ui.load('modal-content', OllamaDetectedModal.ui());
    Ui.show('intro-model-instructions');
    Ui.show('ollama-detected');
    this.registerEventListeners();
  },

  show(models) {
    this.setup()

    const hasModels = models && models.length > 0;

    if (hasModels) {
      ModelSelector.populate(models, models[0].name);
      Ui.updateSuccessText(Models.count);
      Ui.showOllamaStatsContainer();
    }
    else {
      DownloadProgressHandler.setupHandler();
      Ui.showNoModelsContainer();
    }
  },

  destroy() {
    EventHandler.destroy(Controller.abortController);
    Ui.destroyModal('ollama-detected');
  },

  handleReturn() {
    this.destroy();
    NavigationHandler.frameworkSelection();
  },

  async handleContinue() {
    this.destroy();

    await ConfigFile.create();
    await ConfigFile.saveToConfig({
      selectedModel: Models.selected,
      ollamaModelCount: Models.count
    });

    const isConnected = await OllamaBackend.checkConnection();
    NavigationHandler.completeSetup(isConnected, this);
  },
}

export { OllamaDetected }
