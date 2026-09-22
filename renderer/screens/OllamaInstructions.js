import { OllamaDetected } from './OllamaDetected.js';
import { OllamaSuccess } from './OllamaSuccess.js';

const INSTALL_CONFIGS = {
  macOS: {
    shell: 'Terminal',
    command: 'curl -fsSL https://ollama.com/install.sh | sh',
    requirement: 'Requires macOS 14 Sonoma or later',
    downloadUrl: 'https://ollama.com/download/Ollama.dmg'
  },
  windows: {
    shell: 'PowerShell',
    command: 'irm https://ollama.com/install.ps1 | iex',
    requirement: 'Requires Windows 10 or later',
    downloadUrl: 'https://ollama.com/download/OllamaSetup.exe'
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
        <p class="secondary-text" style="font-size: 1rem;">Click on your operating system to see download/install instructions</p>

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

const DomQuery = {
  getElement: (id) => document.getElementById(id),

  removeElement(id) {
    const el = this.getElement(id);
    if (el)
      el.remove();
  },

  insertHTML(containerId, html) {
    const container = this.getElement(containerId);

    if (container)
      container.insertAdjacentHTML('beforeend', html);
  },

  updateText(id, text) {
    const el = this.getElement(id);
    if (el)
      el.textContent = text;
  },

  updateInputValue(id, value) {
    const el = this.getElement(id);
    if (el)
      el.value = value;
  },

  toggleVisibility(id, isVisible) {
    const el = this.getElement(id);

    el.style.contentVisibility = isVisible ? '' : 'hidden';
    el.style.opacity = isVisible ? 1 : 0;
    el.style.visibility = isVisible ? 'visible' : 'hidden';
  },

  setElementClass(id, className, add = true) {
    const el = this.getElement(id);

    if (el)
      el.classList[add ? 'add' : 'remove'](className);
  },

  toggleButton(id, isVisible) {
    const el = this.getElement(id);
    el.style.display = isVisible ? '' : 'none';
  },

  hideCard(id) {
    const card = this.getElement(id);
    card.style.display = 'none';
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
      : OllamaSuccess.show('failed', prevModal);
  }
}

const EventHandler = {
  abortController: new AbortController(),

  setupEvents(elems) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);

      if (elem) {
        elem.addEventListener('click', fn, {
          signal: this.abortController.signal
        });
      }
    });
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

const PlatformManager = {
  handlePlatformSelect(platform) {
    platform === 'linux'
      ? DomQuery.toggleButton('download-ollama-btn', false)
      : DomQuery.toggleButton('download-ollama-btn', true);

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
        DomQuery.hideCard(card.id);
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
    this.triggerCopyFeedback('install-cmd');
  },

  triggerCopyFeedback(inputField) {
    ClipboardManager.showCopiedMessageInInputField(inputField);
  },

  async handleDownload(platform) {
    const config = INSTALL_CONFIGS[platform];

    if (config)
      await WindowApi.openUrl(config.downloadUrl);
  },

  async handleContinue() {
    const isConnectionSuccessful = await WindowApi.checkConnection();
    NavigationHandler.navigate(isConnectionSuccessful, this);
    this.destroy();
  },

  handleReturn() {
    DomQuery.toggleVisibility('dl-ollama-instructions', false);
    this.destroy();
  },

  destroy() {
    OllamaInstructionsManager.destroyUI();
  }
};

export { OllamaInstructions };
