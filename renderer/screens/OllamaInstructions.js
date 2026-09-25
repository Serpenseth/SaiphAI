import { OllamaDetected } from './OllamaDetected.js';
import { OllamaSuccess } from './OllamaSuccess.js';
import { FrameworkSelection } from './FrameworkSelection.js';

import { DomQuery } from '../utility/utilities.js';

const INSTALL_CONFIGS = {
  macOS: {
    shell: 'Terminal',
    command: 'curl -fsSL https://ollama.com/install.sh | sh',
    requirement: 'Requires macOS 14 Sonoma or later',
    downloadUrl: 'https://github.com/ollama/ollama/releases/latest/download/OllamaSetup.dmg'
  },
  windows: {
    shell: 'PowerShell',
    command: 'irm https://ollama.com/install.ps1 | iex',
    requirement: 'Requires Windows 10 or later',
    downloadUrl: 'https://github.com/ollama/ollama/releases/latest/download/OllamaSetup.exe'
  },
  linux: {
    shell: 'Terminal',
    command: 'curl -fsSL https://ollama.com/install.sh | sh',
    requirement: '',
    downloadUrl: null
  }
};

const OllamaInstructionsModal = {
  ui() {
    return `
      <div id="dl-ollama-instructions" style="content-visibility: hidden">
        <h1>Install Ollama</h1>

        <div>
          <div id="os-selected" class="intro-text" style="gap: 3em; display: flex; flex-direction: row; margin-top: 2em;">
            <div id="option-macOS" class="model-card ollama-download-card">
              <img
                src="https://logos-world.net/wp-content/uploads/2020/04/Apple-Logo.png"
                style="height: 32px; width: 32px; align-item: self; margin-bottom: 4px;"
              >
              <p style="margin-bottom: 0;">MacOS</p>
            </div>

            <div id="option-windows" class="model-card ollama-download-card" >
              <img
                src="https://logos-world.net/wp-content/uploads/2020/12/Windows-New-Logo.png"
                style="height: 32px; width: 32px; align-item: self; margin-bottom: 4px;"
              >
              <p style="margin-bottom: 0;">Windows</p>
            </div>

            <div id="option-linux" class="model-card ollama-download-card">
              <img
                src="https://logos-world.net/wp-content/uploads/2020/09/Linux-Logo.png"
                style="height: 32px; width: 32px; align-item: self; margin-bottom: 4px;"
              >
              <p style="margin-bottom: 0;">Linux</p>
            </div>
          </div>

          <div id="os-specific-download" class="intro-text" style="flex-direction: column; margin-top: 0.5em;">
            <!-- Complete sentence dynamically based on OS -->
            <p id="paste-into" class='secondary-text' style="margin-top: 0.5rem; margin-bottom: 0.5rem;" ></p>
            <div style="flex-direction: row;">
              <input id="install-cmd" class="input" readonly="true">
              <button id="copy-cmd">
                <img src="../assets/copy.png" style="display: flex; width: 16px; height: 16px;"></img>
              </button>
            </div>
            <p class='secondary-text' style="font-size: 0.8rem; margin-top: 0.5rem">
              or press the button below to download Ollama
            </p>
            <button id="download-ollama-btn" class="btn btn-secondary" style="margin: 1rem 0;">Download</button>
            <p id="requires-msg"></p>
          </div>
          <br>
        </div>
        <br>
        <div class="btn-bottom-container">
          <button id="return-instructions-btn" class="btn btn-secondary modal-nav-button">
            Select AI framework
          </button>
          <button id="complete-instructions-btn" class="btn btn-primary modal-nav-button">Continue</button>
        </div>
      </div>`;
  }
};

const WindowApi = {
  async checkConnection() {
    return window.electronAPI.checkOllama();
  },

  getPlatform() {
    return window.electronAPI.getPlatform();
  },

  openUrl(url) {
    if (url)
      window.open(url);
  }
}

const NavigationHandler = {
  navigate(goodToGo, prevModal) {
    goodToGo
      ? OllamaDetected.show([])
      : OllamaSuccess.show('failed', null, prevModal);
  }
}

const EventHandler = {
  abortController: new AbortController(),
  isInit: false,

  setupEvents(elems) {
    if (!this.isInit) {
      elems.forEach(({ id, fn }) => {
        const elem = DomQuery.getElement(id);

        if (elem) {
          elem.addEventListener('click', fn, {
            signal: this.abortController.signal
          });
        }
      });
      this.isInit = true;
    }
  },
}

const UiHandler = {
  loadUI(uiElem, htmlContent) {
    // Check if HTML has already been inserted
    if (DomQuery.getElement('dl-ollama-instructions'))
      return;

    DomQuery.insertHTML(uiElem, htmlContent);
  },

  showUI(introModel, dlOllamaModel) {
    DomQuery.toggleVisibility(introModel, true);
    DomQuery.toggleVisibility(dlOllamaModel, true);
  }
}

function hideCard(id) {
  const card = DomQuery.getElement(id);
  card.style.display = 'none';
}

const PlatformManager = {
  handlePlatformSelect(platform) {
    platform === 'linux'
      ? DomQuery.showElement('download-ollama-btn', false)
      : DomQuery.showElement('download-ollama-btn', true);

    const config = INSTALL_CONFIGS[platform];
    const dom = DomQuery;

    dom.updateInputValue('install-cmd', config.command);
    dom.updateText('paste-into', `Paste the code below into ${config.shell}`);
    dom.updateText('requires-msg', config.requirement);

    ['macOS', 'windows', 'linux'].forEach(p => {
      dom.setElementClass(`option-${p}`, 'model-card-active', p === platform);
    });
  },

  hideUnsupportedPlatforms(currentPlatform, allPlatforms) {
    Object.values(allPlatforms).forEach(card => {
      if (!card.id.includes(currentPlatform)) {
        hideCard(card.id);
      }
    });
  }
}

const ClipboardManager = {
  write(data) {
    navigator.clipboard.writeText(data);
  },

  showCopiedMessageInInputField(inputFieldElement) {
    const inputField = DomQuery.getElement(inputFieldElement);
    const originalValue = inputField.value;
    inputField.value = "Install command copied!";
    setTimeout(() => { inputField.value = originalValue; }, 2000);
  },

  handleCopy(fromElement) {
    const inputField = DomQuery.getElement(fromElement)
    ClipboardManager.write(inputField.value);
  }
}

const OllamaInstructionsManager = {
  showUI() {
    UiHandler.loadUI('modal-content', OllamaInstructionsModal.ui());
    UiHandler.showUI('intro-model-instructions', 'dl-ollama-instructions');
  },

  destroyUI() {
    EventHandler.abortController.abort();
    DomQuery.removeElement('dl-ollama-instructions');
  },

  hideUI() {
    DomQuery.toggleVisibility('dl-ollama-instructions', false);
  }
}

let OllamaInstructions = {
  activePlatform: null,

  async registerEventListeners() {
    let platform = await WindowApi.getPlatform();
    // WindowApi.getPlatform() returns win32, not windows
    platform = platform === 'win32' ? 'windows' : platform;

    const allPlatforms = {
      macOS: { id: 'option-macOS' },
      windows: { id: 'option-windows' },
      linux: { id: 'option-linux' },
    }

    this.handlePlatformSelect(platform, allPlatforms);

    const genericEvents = [
      { id: 'copy-cmd', fn: () => this.handleCopy() },
      { id: 'download-ollama-btn', fn: () => this.handleDownload(platform) },
      { id: 'complete-instructions-btn', fn: () => this.handleContinue() },
      { id: 'return-instructions-btn', fn: () => this.handleReturn() },
    ];

    EventHandler.setupEvents(genericEvents);
  },

  show() {
    OllamaInstructionsManager.showUI();
    this.registerEventListeners();
  },

  handlePlatformSelect(platform, allPlatforms) {
    PlatformManager.hideUnsupportedPlatforms(platform, allPlatforms);
    PlatformManager.handlePlatformSelect(platform);
  },

  handleCopy() {
    ClipboardManager.handleCopy('install-cmd');
    ClipboardManager.showCopiedMessageInInputField('install-cmd');
  },

  async handleDownload(platform) {
    const config = INSTALL_CONFIGS[platform];

    if (config)
      await WindowApi.openUrl(config.downloadUrl);
  },

  async handleContinue() {
    const isConnectionSuccessful = await WindowApi.checkConnection();
    NavigationHandler.navigate(isConnectionSuccessful, this);

    isConnectionSuccessful ? this.destroy() : this.hide();
  },

  handleReturn() {
    DomQuery.toggleVisibility('dl-ollama-instructions', false);
    FrameworkSelection.show();
    this.hide();
  },

  destroy() {
    OllamaInstructionsManager.destroyUI();
  },

  hide() {
    OllamaInstructionsManager.hideUI();
  }
};

export { OllamaInstructions };
