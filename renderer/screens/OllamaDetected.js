import { createSuccessScreen } from './OllamaSuccess.js';

const Backend = {
  async checkConnection() {
    return await window.electronAPI.checkOllama();
  },

  async downloadModel(modelName) {
    return await window.electronAPI.downloadOllamaModel(modelName);
  },

  abortDownload() {
    window.electronAPI.abortModelDownload();
  },

  async saveToConfig(data) {
    await window.electronAPI.createConfigFile();
    await window.electronAPI.writeToConfigFile({
      selectedModel: data.selectedModel,
      ollamaModelCount: data.ollamaModelCount,
      modelFramework: "ollama"
    });
  }
}

class OllamaDetectedUI {
  constructor() {
    this.introModal = document.getElementById('intro-model-instructions');
    this.ollamaDetectedModal = document.getElementById("ollama-detected");
    this.noModelsDiv = document.getElementById("no-models");

    this.elements = {
      progressText: document.getElementById('ollama-dl-progress-text'),
      modelInput: document.getElementById("ollama-model-to-pull"),
      downloadButton: document.getElementById("dl-ollama-model"),
      abortButton: document.getElementById("abort-ollama-model-dl"),
      completeButton: document.getElementById("verify-ollama-after-model-dl"),
      connectionLi: document.getElementById("ollama-connection"),
      modelSelectLi: document.getElementById("details-modal-select"),
      modelCountLi: document.getElementById("model-count"),
      chooseFrameworkButton: document.getElementById("close-ollama-model-dl"),
      downloadText: document.getElementById("dl-text"),
      downloadError: document.getElementById("download-error"),
      pressDownloadMsg: document.getElementById("press-download-to-start"),
      statsContainer: document.getElementById('ollama-stats-container'),
      continueButton: document.getElementById("ollama-detected-complete"),
      closeOllamaDetails: document.getElementById("close-ollama-details"),
    }
  }

  _showModal(modal) {
    modal.style.contentVisibility = '';
    modal.style.opacity = 1;
    modal.style.visibility = "visible";
  }

  updateProgress(text) {
    if (this.elements.progressText)
      this.elements.progressText.textContent = text;
  }

  hideProgress() {
    if (this.elements.progressText)
      this.elements.progressText.style.display = 'none';
  }

  downloadProgress(data) {
    if (data.percent !== 100)
      this.updateProgress(`${data.percent}%`);

    else
      this.updateProgress("Verifying SHA digest...");
  }

  async showErrorMessage(error) {
    let wait = () => new Promise(resolve => setTimeout(resolve, 2000));

    this.elements.modelInput.style.border = '2px solid #F84E4E';
    this.elements.downloadError.textContent = error;
    this.elements.downloadError.style.display = 'block';
    this.elements.downloadButton.style.display = 'none';

    await wait();
    this.elements.modelInput.style.border = 'none';
    this.elements.downloadError.style.display = 'none';
    this.elements.downloadButton.removeAttribute("style");

    wait = null;
  }

  setDownloadUIState(state, data={}) {
    const {
      downloadButton,
      abortButton,
      downloadText,
      chooseFrameworkButton,
      downloadError,
      completeButton
    } = this.elements;

    if (state === 'downloading') {
      this.updateProgress('0%');

      downloadText.style.display = 'block';
      downloadButton.style.display = 'none';
      abortButton.style.display = 'block';
      chooseFrameworkButton.style.display = 'none';
    }
    else if (state === 'error') {
      this.hideProgress();
      this.showErrorMessage(data.error);

      downloadText.style.display = 'none'
      chooseFrameworkButton.style = '';
      abortButton.style.display = 'none';
    }
    else if (state === 'aborted') {
      this.hideProgress();

      downloadText.style.display = 'none';
      downloadButton.style.display = 'block';
      chooseFrameworkButton.style = '';
      abortButton.style.display = 'none';
      downloadButton.removeAttribute("style");
    }

    else if (state === 'success') {
      this.elements.progressText.remove();

      downloadText.textContent = "Download complete";
      completeButton.style = 'block';

      abortButton.remove();
      downloadError.remove();
      chooseFrameworkButton.remove();
    }
  }

  setDownloadButtonVisibility(isVisible) {
    const { downloadButton, pressDownloadMsg } = this.elements;

    if (!isVisible) {
      downloadButton.style.display = 'none';
      pressDownloadMsg.style.display = 'none';
    }
    else {
      const msg = "Press the Download Model button below to start the download";

      downloadButton.style.display = '';
      pressDownloadMsg.style.display = '';
      pressDownloadMsg.textContent = msg;
    }
  }

  showOllamaStats(modelCount, models, selectedModel) {
    const {
      statsContainer,
      connectionLi,
      modelCountLi,
      modelSelectLi
    } = this.elements;

    const connected = "Connection: ✔️ Connected to http://localhost:11434";

    statsContainer.style.contentVisibility = '';
    connectionLi.textContent = connected;
    modelCountLi.textContent = `Total Models Found: ${modelCount}`;

    const options = models.map(m => {
      const s = document.createElement('option');
      s.value = m.name;
      s.textContent = m.name;

      if (m.name === selectedModel)
        s.selected = true;

      return s;
    });
    modelSelectLi.replaceChildren(...options);
  }

  showNoModels() {
    this.noModelsDiv.style.contentVisibility = '';
  }

  show() {
    this._showModal(this.introModal);
    this._showModal(this.ollamaDetectedModal);
  }

  hide() {
    this.ollamaDetectedModal.style.contentVisibility = 'hidden';
  }

  remove() {
    this.ollamaDetectedModal.remove();
  }
}

const NavigationHandler = {
  completeSetup() {
    const successModal = createSuccessScreen('success', 'Ollama');
    successModal.show();
  },

  showFailed(prevModal) {
    const failed = createSuccessScreen('failed', null, prevModal);
    failed.show();
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
    this.progressHandler = null;
    this.isAlreadyInit = false;
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler, { signal: this.controller.signal });
  }

  init(hasModels) {
    if (!hasModels) {
      this.progressHandler = (data) => {
        this.coordinator.downloadProgress(data);
      }

      window.electronAPI.onDLModelProgress(this.progressHandler);

      // Show download model button when input isn't empty
      this.addListener(this.ui.elements.modelInput, 'input', (e) => {
        this.coordinator.showPressDownloadButton(e.target.value);
      });

      // Download Ollama model button
      this.addListener(this.ui.elements.downloadButton, 'click', () => {
        this.coordinator.downloadModel(this.ui.elements.modelInput.value);
      });

      // Abort Ollama download
      this.addListener(this.ui.elements.abortButton, 'click', () => {
        this.coordinator.abortDownload();
      });

      // Complete setup
      this.addListener(this.ui.elements.completeButton, 'click', () => {
        this.coordinator.verify();
      });
    }

    // Return to AI framework selection
    this.addListener(this.ui.elements.continueButton, 'click', () => {
      this.coordinator.verify();
    });

    // Complete setup
    this.addListener(this.ui.elements.closeOllamaDetails, 'click', () => {
      this.coordinator.showModelSelector();
    });
  }

  cleanup() {
    if (this.progressHandler) {
      window.electronAPI.removeDownloadProgress(this.progressHandler);
    }

    this.isAlreadyInit = false;
    this.controller.abort();
  }
}

class ModelDownloadManager {
  constructor(backend, ui) {
    this.ui = ui;
    this.service = backend;
  }

  async downloadModel(modelName) {
    try {
      const isRunning = await this.service.checkConnection();

      if (!isRunning) {
        this.ui.setDownloadUIState('error', { error: "Error: Ollama isn't running." });
        return;
      }

      this.ui.setDownloadUIState('downloading');

      const result = await this.service.downloadModel(modelName);

      if (result.success) {
        this.ui.setDownloadUIState('success');
      }
      else {
        this.ui.setDownloadUIState('error', { error: result.error });
      }
    }
    catch (e) {
      this.ui.setDownloadUIState('error', { error: e.message });
    }
  }

  abortDownload() {
    this.service.abortDownload();
    this.ui.setDownloadUIState('aborted');
  }

  downloadProgress(data) {
    this.ui.downloadProgress(data);
  }
}

class OllamaDetected {
  constructor(
    backend,
    ui,
    navigationHandler,
    eventHandler,
    modelDownloadManager,
    models
  ) {
    this.service = backend;
    this.ui = ui;
    this.navigation = navigationHandler;
    this.eventHandler = eventHandler;
    this.downloadManager = modelDownloadManager;
    this.models = models;
  }

  show() {
    this.ui.show();

    const hasModels = this.models && this.models.length > 0;

    if (!this.eventHandler.isAlreadyInit) {
      this.eventHandler.init(hasModels);
      this.eventHandler.isAlreadyInit = true;
    }

    if (hasModels) {
      this.ui.showOllamaStats(
          this.models.length,
          this.models,
          this.models[0].name
        );
    }
    else {
      this.ui.showNoModels();
    }
  }

  destroy() {
    this.eventHandler.cleanup();

    this.service = null;
    this.ui = null;
    this.navigation = null;
    this.eventHandler = null;
    this.downloadManager = null;
  }

  showPressDownloadButton(inputValue) {
    const shouldShow = inputValue.trim() !== '';
    this.ui.setDownloadButtonVisibility(shouldShow);
  }

  async downloadModel(modelName) {
    this.downloadManager.downloadModel(modelName);
  }

  abortDownload() {
    this.downloadManager.abortDownload();
  }

  downloadProgress(data) {
    this.downloadManager.downloadProgresss(data);
  }

  async completeSetup() {
    //this.service.saveModel(this.ui.elements.modelSelectLi.value);
    await this.service.saveToConfig({
      selectedModel: this.ui.elements.modelSelectLi.value,
      ollamaModelCount: this.models.length,
    });

    this.ui.remove();
    this.navigation.completeSetup();
    this.destroy();
  }

  verify() {
    this.service.checkConnection().then(isConnected => {
      if(!isConnected) {
        this.navigation.showFailed(this);
        this.ui.hide();
      }
      else
        this.completeSetup();
    });
  }

  completeModelDownloadSetup() {
    /*
    this.service.saveModel(this.ui.elements.modelInput.value);
    this.service.saveOllamaAsFramework();
    */
    this.service.saveToConfig({
      selectedModel: this.ui.elements.modelInput.value,
      ollamaModelCount: 1,
    });

    this.ui.remove();
    this.navigation.completeSetup();
    this.destroy();
  }

  showModelSelector() {
    this.ui.hide();
    this.navigation.frameworkSelection();
    this.destroy();
  }
}

export function createOllamaScreen(models) {
  const ui = new OllamaDetectedUI();
  const eventHandler = new EventHandler(ui, null);
  const modelDownloadManager = new ModelDownloadManager(Backend, ui);

  const ollamaScreen = new OllamaDetected(
    Backend,
    ui,
    NavigationHandler,
    eventHandler,
    modelDownloadManager,
    models
  );

  eventHandler.coordinator = ollamaScreen;

  return ollamaScreen;
}
