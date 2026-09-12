import { createSuccessScreen } from './OllamaSuccess.js';

let Backend = {
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

let OllamaDetectedElems = {
  introModal: null,
  ollamaDetectedModal: null,
  noModelsDiv: null,
  progressText: null,
  modelInput: null,
  downloadButton: null,
  abortButton: null,
  completeButton: null,
  connectionLi: null,
  modelSelectLi: null,
  modelCountLi: null,
  chooseFrameworkButton: null,
  downloadText: null,
  downloadError: null,
  pressDownloadMsg: null,
  statsContainer: null,
  continueButton: null,
  closeOllamaDetails: null,
}

let DownloadProgressHandler = {
  updateProgress(text) {
    if (OllamaDetectedElems.progressText)
      OllamaDetectedElems.progressText.textContent = text;
  },

  hideProgress() {
    if (OllamaDetectedElems.progressText)
      OllamaDetectedElems.progressText.style.display = 'none';
  },

  downloadProgress(data) {
    if (data.percent !== 100)
      OllamaDetectedUI.updateProgress(`${data.percent}%`);

    else
      OllamaDetectedUI.updateProgress("Verifying SHA digest...");
  },
}

function OllamaDetectedUI() {
  const div = document.createElement('div');
  div.id = 'ollama-detected';
  div.className = 'intro-text';
  div.style.contentVisibility = 'hidden';
  div.innerHTML = `
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
  `;

  return div;
}

let OllamaDetectedModal = {
  show() {
    const { introModal, ollamaDetectedModal } = OllamaDetectedElems;

    introModal.style.contentVisibility = '';
    introModal.style.opacity = 1;
    introModal.style.visibility = "visible";

    ollamaDetectedModal.style.contentVisibility = '';
    ollamaDetectedModal.style.opacity = 1;
    ollamaDetectedModal.style.visibility = "visible";
  },

  hide() {
    const { ollamaDetectedModal } = OllamaDetectedElems;
    ollamaDetectedModal.style.contentVisibility = 'hidden';
  },

  remove() {
    const { ollamaDetectedModal } = OllamaDetectedElems;
    ollamaDetectedModal.remove();
  },

  build() {
    const ui = OllamaDetectedUI();
    document.getElementById('modal-content').appendChild(ui);
  },

  initElements() {
    OllamaDetectedElems = {
      introModal: document.getElementById('intro-model-instructions'),
      ollamaDetectedModal: document.getElementById("ollama-detected"),
      noModelsDiv: document.getElementById("no-models"),
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
  },

  async showErrorMessage(error) {
    let wait = () => new Promise(resolve => setTimeout(resolve, 2000));

    const { modelInput, downloadError, downloadButton } = OllamaDetectedElems;

    modelInput.style.border = '2px solid #F84E4E';
    downloadError.textContent = error;
    downloadError.style.display = 'block';
    downloadButton.style.display = 'none';

    await wait();
    modelInput.style.border = 'none';
    downloadError.style.display = 'none';
    downloadButton.removeAttribute("style");

    wait = null;
  },

  updateProgress(text) {
    DownloadProgressHandler.updateProgress(text);
  },

  hideProgress() {
    DownloadProgressHandler.hideProgress();
  },

  downloadProgress(data) {
    DownloadProgressHandler.downloadProgress(data);
  },

  setDownloadUIState(state, data={}) {
    const {
      downloadButton,
      abortButton,
      downloadText,
      chooseFrameworkButton,
      downloadError,
      completeButton
    } = OllamaDetectedElems;

    if (state === 'downloading') {
      OllamaDetectedUI.updateProgress('0%');

      downloadText.style.display = 'block';
      downloadButton.style.display = 'none';
      abortButton.style.display = 'block';
      chooseFrameworkButton.style.display = 'none';
    }
    else if (state === 'error') {
      OllamaDetectedUI.hideProgress();
      OllamaDetectedUI.showErrorMessage(data.error);

      downloadText.style.display = 'none'
      chooseFrameworkButton.style = '';
      abortButton.style.display = 'none';
    }
    else if (state === 'aborted') {
      OllamaDetectedUI.hideProgress();

      downloadText.style.display = 'none';
      downloadButton.style.display = 'block';
      chooseFrameworkButton.style = '';
      abortButton.style.display = 'none';
      downloadButton.removeAttribute("style");
    }

    else if (state === 'success') {
      OllamaDetectedElems.progressText.remove();

      downloadText.textContent = "Download complete";
      completeButton.style = 'block';

      abortButton.remove();
      downloadError.remove();
      chooseFrameworkButton.remove();
    }
  },

  setDownloadButtonVisibility(isVisible) {
    const { downloadButton, pressDownloadMsg } = OllamaDetectedElems;

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
  },

  showOllamaStats(modelCount, models, selectedModel) {
    const {
      statsContainer,
      connectionLi,
      modelCountLi,
      modelSelectLi
    } = OllamaDetectedElems;

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
  },

  showNoModels() {
    const { noModelsDiv } = OllamaDetectedElems;
    noModelsDiv.style.contentVisibility = '';
  },
}

let NavigationHandler = {
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

let Controller = {
  controller: new AbortController()
}

let EventHandlerVariables = {
  isAlreadyInit: false,
  progressHandler: null,
}

let EventHandler = {
  addListener(element, event, handler) {
    element.addEventListener(event, handler, { signal: Controller.controller.signal });
  },

  init(hasModels) {
    const {
      modelInput,
      downloadButton,
      abortButton,
      completeButton,
      continueButton,
      closeOllamaDetails,
    } = OllamaDetectedElems;

    const { progressHandler } = EventHandlerVariables;

    if (!hasModels) {
      progressHandler = (data) => {
        this.coordinator.downloadProgress(data);
      }

      window.electronAPI.onDLModelProgress(progressHandler);

      // Show download model button when input isn't empty
      EventHandler.addListener(modelInput, 'input', (e) => {
        this.coordinator.showPressDownloadButton(e.target.value);
      });

      // Download Ollama model button
      this.addListener(downloadButton, 'click', () => {
        this.coordinator.downloadModel(modelInput.value);
      });

      // Abort Ollama download
      this.addListener(abortButton, 'click', () => {
        this.coordinator.abortDownload();
      });

      // Complete setup
      this.addListener(completeButton, 'click', () => {
        this.coordinator.verify();
      });
    }

    // Return to AI framework selection
    this.addListener(continueButton, 'click', () => {
      this.coordinator.verify();
    });

    // Complete setup
    this.addListener(closeOllamaDetails, 'click', () => {
      this.coordinator.showModelSelector();
    });
  },

  cleanup() {
    const { isAlreadyInit, progressHandler} = EventHandlerVariables;

    if (progressHandler) {
      window.electronAPI.removeDownloadProgress(progressHandler);
    }

    isAlreadyInit = false;
    Controller.controller.abort();
  }
}

let ModelDownloadManager = {
  async downloadModel(modelName) {
    try {
      const isRunning = await Backend.checkConnection();

      if (!isRunning) {
        OllamaDetectedModal.setDownloadUIState('error', {
          error: "Error: Ollama isn't running."
        });
        return;
      }

      OllamaDetectedModal.setDownloadUIState('downloading');

      const result = await Backend.downloadModel(modelName);

      if (result.success) {
        OllamaDetectedModal.setDownloadUIState('success');
      }
      else {
        OllamaDetectedModal.setDownloadUIState('error', {
          error: result.error
        });
      }
    }
    catch (e) {
      OllamaDetectedModal.setDownloadUIState('error', { error: e.message });
    }
  },

  abortDownload() {
    Backend.abortDownload();
    OllamaDetectedModal.setDownloadUIState('aborted');
  },

  downloadProgress(data) {
    OllamaDetectedModal.downloadProgress(data);
  }
}

let ollamaModels = null;

export let OllamaDetected = {
  show(models) {
    ollamaModels = models;
    OllamaDetectedModal.build();
    OllamaDetectedModal.initElements();
    OllamaDetectedModal.show();

    const hasModels = models && models.length > 0;

    if (!EventHandlerVariables.isAlreadyInit) {
      EventHandler.init(hasModels);
      EventHandlerVariables.isAlreadyInit = true;
    }

    if (hasModels) {
      OllamaDetectedModal.showOllamaStats(
          models.length,
          models,
          models[0].name
        );
    }
    else {
      OllamaDetectedModal.showNoModels();
    }
  },

  destroy() {
    EventHandler.cleanup();

    Backend = null;
    OllamaDetectedModal = null;
    NavigationHandler = null;
    EventHandler = null;
    modelDownloadManager = null;
  },

  showPressDownloadButton(inputValue) {
    const shouldShow = inputValue.trim() !== '';
    OllamaDetectedModal.setDownloadButtonVisibility(shouldShow);
  },

  async downloadModel(modelName) {
    modelDownloadManager.downloadModel(modelName);
  },

  abortDownload() {
    modelDownloadManager.abortDownload();
  },

  downloadProgress(data) {
    modelDownloadManager.downloadProgresss(data);
  },

  async completeSetup() {
    const { modelSelectLi } = OllamaDetectedElems;
    await Backend.saveToConfig({
      selectedModel: modelSelectLi.value,
      ollamaModelCount: ollamaModels.length,
    });

    OllamaDetectedModal.remove();
    NavigationHandler.completeSetup();
    OllamaDetected.destroy();
  },

  verify() {
    Backend.checkConnection().then(isConnected => {
      if(!isConnected) {
        NavigationHandler.showFailed(this);
        OllamaDetectedModal.hide();
      }
      else
        OllamaDetected.completeSetup();
    });
  },

  async completeModelDownloadSetup() {
    const { modelSelectLi } = OllamaDetectedElems;
    await Backend.saveToConfig({
      selectedModel: modelSelectLi.value,
      ollamaModelCount: 1,
    });

    OllamaDetectedModal.remove();
    NavigationHandler.completeSetup();
    OllamaDetected.destroy();
  },

  showModelSelector() {
    OllamaDetectedModal.hide();
    NavigationHandler.frameworkSelection();
    OllamaDetected.destroy();
  }
}
