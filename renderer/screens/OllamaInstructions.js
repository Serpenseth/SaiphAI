import { createOllamaScreen } from './OllamaDetected.js';
import { createSuccessScreen } from './OllamaSuccess.js';

const Backend = {
  async checkConnection() {
    return await window.electronAPI.checkOllama();
  },

  async openDownloadLink() {
    const userPlatform = await window.electronAPI.getPlatform();
    const downloadUrl = 'https://ollama.com/download/';

    switch (userPlatform) {
      case 'win32':
        window.open(`${downloadUrl}/OllamaSetup.exe`);
        break;

      case 'darwin':
        window.open(`${downloadUrl}/Ollama.dmg`);
        break;
    }
  },

  pasteToClipboard(text) {
    navigator.clipboard.writeText(text);
  }
}

class OllamaInstructionsUI {
  constructor() {
    this.dlOllamaModal = document.getElementById('dl-ollama-instructions');
    this.elements = {
      macOSOption: document.getElementById("option-macOS"),
      windowsOption: document.getElementById("option-windows"),
      linuxOption: document.getElementById("option-linux"),
      pasteText: document.getElementById("paste-into"),
      copyCmdButton: document.getElementById("copy-cmd"),
      installCmdInput: document.getElementById("install-cmd"),
      downloadOllamaButton: document.getElementById("download-ollama-btn"),
      frameworkSelection: document.getElementById("return-instructions-btn"),
      completeButton: document.getElementById("complete-instructions-btn"),
      requiredMessage: document.getElementById("requires-msg"),
    }
  }

 _showModal(modal) {
    modal.style.contentVisibility = '';
    modal.style.opacity = 1;
    modal.style.visibility = "visible";
 }

  show() {
    this._showModal(this.dlOllamaModal);
  }

  hide() {
    this.dlOllamaModal.style.contentVisibility = 'hidden';
  }

  remove() {
    this.dlOllamaModal.remove();
  }

  setCardStyle(card) {
    card.classList.add('model-card-active');
  }

  resetCardStyle(card) {
    card.classList.remove('model-card-active');
  }

  setRequiredMessage(message) {
    this.elements.requiredMessage.textContent = message;
  }

  async showCopiedMessage() {
    let wait = () => new Promise(resolve => setTimeout(resolve, 2000));

    const { installCmdInput } = this.elements;
    const oldValue = installCmdInput.value.trim();

    if (oldValue.includes('copied!') || oldValue.length === 0)
      return;

    installCmdInput.style.border = "1.5px solid rgba(96, 170, 206, 0.6)";
    installCmdInput.value = "Install command copied!";

    await wait();
    installCmdInput.style.border = '';
    installCmdInput.value = oldValue;
  }

  setPasteText(text) {
    this.elements.pasteText.textContent = text;
  }

  showMacInstall() {
    const {
      pasteText,
      installCmdInput,
      macOSOption,
      linuxOption,
      windowsOption,
    } = this.elements;

    pasteText.textContent =  "Paste the code below into Terminal";
    installCmdInput.value = "curl -fsSL https://ollama.com/install.sh | sh";

    this.setCardStyle(macOSOption);
    this.resetCardStyle(windowsOption);
    this.resetCardStyle(linuxOption);
    this.setRequiredMessage("Requires macOS 14 Sonoma or later");
  }

  showWindowsInstall() {
    const {
      pasteText,
      installCmdInput,
      macOSOption,
      linuxOption,
      windowsOption,
    } = this.elements;

    pasteText.textContent =  "Paste the code below into PowerShell";
    installCmdInput.value = "irm https://ollama.com/install.ps1 | iex";

    this.setCardStyle(windowsOption);
    this.resetCardStyle(linuxOption);
    this.resetCardStyle(macOSOption);
    this.setRequiredMessage("Requires Windows 10 or later");
  }

  showLinuxInstall() {
    const {
      pasteText,
      installCmdInput,
      macOSOption,
      linuxOption,
      windowsOption,
    } = this.elements;

    pasteText.textContent =  "Paste the code below into Terminal";
    installCmdInput.value = "curl -fsSL https://ollama.com/install.sh | sh";

    this.setCardStyle(linuxOption);
    this.resetCardStyle(windowsOption);
    this.resetCardStyle(macOSOption);
    this.setRequiredMessage('');
  }
}

const NavigationHandler = {
  goToModelDownload() {
    const ollamaDetected = createOllamaScreen([]);
    ollamaDetected.show();
  },

  ollamaInstallFailed(prevModal) {
    const failed = createSuccessScreen('failed', prevModal);
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
    this.isAlreadyInit = false;
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler, { signal: this.controller.signal });
  }

  init() {
    this.addListener(this.ui.elements.macOSOption, 'click', () => {
      this.coordinator.showMacInstall();
    });

    this.addListener(this.ui.elements.windowsOption, 'click', () => {
      this.coordinator.showWindowsInstall();
    });

    this.addListener(this.ui.elements.linuxOption, 'click', () => {
      this.coordinator.showLinuxInstall();
    });

    this.addListener(this.ui.elements.copyCmdButton, 'click', () => {
      this.coordinator.copyInstallCmd();
    });

    this.addListener(this.ui.elements.downloadOllamaButton, 'click', () => {
      this.coordinator.downloadOllama();
    });

    this.addListener(this.ui.elements.frameworkSelection, 'click', () => {
      this.coordinator.frameworkSelection();
    });

    this.addListener(this.ui.elements.completeButton, 'click', () => {
      this.coordinator.goToModelDownload();
    });
  }

  cleanup() {
    this.isAlreadyInit = false;
    this.controller.abort();
  }
}

class OllamaInstructions {
  constructor(backend, ui, navigationHandler, eventHandler) {
    this.service = backend;
    this.ui = ui;
    this.navigation = navigationHandler;
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
    this.eventHandler.cleanup();

    this.service = null;
    this.ui = null;
    this.navigation = null;
    this.eventHandler = null;
  }

  showMacInstall() {
    this.ui.showMacInstall();
  }

  showWindowsInstall() {
    this.ui.showWindowsInstall();
  }

  showLinuxInstall() {
    this.ui.showLinuxInstall();
  }

  copyInstallCmd() {
    const { installCmdInput } = this.ui.elements;
    const installCmd = installCmdInput.value;

    if (installCmd.includes('copied!'))
      return;

    this.service.pasteToClipboard(installCmd);
    this.ui.showCopiedMessage();
  }

  async downloadOllama() {
    await this.service.openDownloadLink();
  }

  async goToModelDownload() {
    const isConnected = await this.service.checkConnection();

    if (isConnected)
      this.navigation.goToModelDownload();

    else {
      this.navigation.ollamaInstallFailed(this);
      this.ui.hide();
      // Return early to prevent wiping the above instance
      return;
    }

    this.ui.remove();
    this.destroy();
  }

  frameworkSelection() {
    this.ui.hide();
    this.navigation.frameworkSelection();
    this.destroy();
  }
}

export function createOllamaInstructionsScreen() {
  const ui = new OllamaInstructionsUI();
  const eventHandler = new EventHandler(ui, null);

  const ollamaInstructions = new OllamaInstructions(
    Backend,
    ui,
    NavigationHandler,
    eventHandler,
  );

  eventHandler.coordinator = ollamaInstructions;

  return ollamaInstructions;
}
