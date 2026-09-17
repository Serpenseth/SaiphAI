import { OllamaDetected } from './OllamaDetected.js';
import { OllamaSuccess } from './OllamaSuccess.js';

const OllamaConnection = {
  check() {
    return window.electronAPI.checkOllama();
  }
};

const OllamaDownloadLink = {
  async open() {
    const platform = await window.electronAPI.getPlatform();

    const urls = {
      win32: 'https://ollama.com/download/OllamaSetup.exe',
      darwin: 'https://ollama.com/download/Ollama.dmg'
    };

    const url = urls[platform];

    if (url)
      window.open(url);
  }
};

const Clipboard = {
  write(text) {
    return navigator.clipboard.writeText(text);
  }
};

function OllamaInstructionsUI() {
  return `
    <div id="dl-ollama-instructions" style="content-visibility: hidden">
      <h1>Install Ollama<h1>
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
    </div>
  `;
}

function setRequiredMessage(message) {
  OllamaInstructionsElems.requiredMessage.textContent = message;
}

async function wait() {
  return new Promise(resolve => setTimeout(resolve, 2000));
}

async function showCopiedMessage() {
  const { installCmdInput } = OllamaInstructionsElems;
  const oldValue = installCmdInput.value.trim();

  if (oldValue.includes('copied!') || oldValue.length === 0)
    return;

  installCmdInput.style.border = "1.5px solid rgba(96, 170, 206, 0.6)";
  installCmdInput.value = "Install command copied!";

  await wait();
  installCmdInput.style.border = '';
  installCmdInput.value = oldValue;
}

function setPasteText(text) {
  OllamaInstructionsElems.pasteText.textContent = text;
}

let selectedCard = null;

let Card = {
  select(card) {
    if (selectedCard === card)
      return;

    card.classList.add('model-card-active');

    if (selectedCard)
      selectedCard.classList.remove('model-card-active');

    selectedCard = card;
  }
}

const installConfigs = {
  macOS: {
    card: () => OllamaInstructionsElems?.macOSOption,
    shell: 'Terminal',
    command: 'curl -fsSL https://ollama.com/install.sh | sh',
    requirement: 'Requires macOS 14 Sonoma or later'
  },
  windows: {
    card: () => OllamaInstructionsElems?.windowsOption,
    shell: 'PowerShell',
    command: 'irm https://ollama.com/install.ps1 | iex',
    requirement: 'Requires Windows 10 or later'
  },
  linux: {
    card: () => OllamaInstructionsElems?.linuxOption,
    shell: 'Terminal',
    command: 'curl -fsSL https://ollama.com/install.sh | sh',
    requirement: ''
  }
};

function showInstall(platform) {
  const config = installConfigs[platform];
  OllamaInstructionsElems.installCmdInput.value = config.command;

  Card.select(config.card());
  setPasteText(`Paste the code below into ${config.shell}`);
  setRequiredMessage(config.requirement);
}

let NavigationHandler = {
  goToModelDownload() {
    OllamaDetected.show([]);
  },

  ollamaInstallFailed(prevModal) {
    OllamaSuccess.show('failed', prevModal);
  },

  /*
  async frameworkSelection() {
    const { createFrameworkSelect } = await import('./FrameworkSelection.js');
    const result = createFrameworkSelect();
    result.show();
  },
  */
}

let OllamaInstructionsElems = {
  init() {
    return {
      introModal: document.getElementById('intro-model-instructions'),
      dlOllamaModal: document.getElementById('dl-ollama-instructions'),
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
    };
  }
}

let OllamaInstructionsModal = {
  show() {
    const { introModal, dlOllamaModal } = OllamaInstructionsElems;

    introModal.style.contentVisibility = '';
    introModal.style.opacity = 1;
    introModal.style.visibility = "visible";

    dlOllamaModal.style.contentVisibility = '';
    dlOllamaModal.style.opacity = 1;
    dlOllamaModal.style.visibility = "visible";
  },

  hide() {
    const { dlOllamaModal } = OllamaInstructionsElems;
    dlOllamaModal.style.contentVisibility = 'hidden';
  },

  remove() {
    const { dlOllamaModal } = OllamaInstructionsElems;
    dlOllamaModal.remove();
  },

  build() {
    const ui = OllamaInstructionsUI();
    document
      .getElementById('modal-content')
      .insertAdjacentHTML('beforeend', ui);
  },
}

function copyInstallCmd() {
  const { installCmdInput } = OllamaInstructionsElems;
  const installCmd = installCmdInput.value;

  if (installCmd.includes('copied!'))
    return;

  Clipboard.write(installCmd);
  OllamaInstructionsModal.showCopiedMessage();
}

let abortController = new AbortController();
let isAlreadyInit = false;

let EventHandler = {
  addListener(element, event, handler) {
    element.addEventListener(event, handler, { signal: abortController.signal });
  },

  init() {
    const {
      macOSOption,
      linuxOption,
      windowsOption,
      copyCmdButton,
      downloadOllamaButton,
      frameworkSelection,
      completeButton
    } = OllamaInstructionsElems

    this.addListener(macOSOption, 'click', () => {
      showInstall('macOS');
    });

    this.addListener(windowsOption, 'click', () => {
      showInstall('windows');
    });

    this.addListener(linuxOption, 'click', () => {
      showInstall('linux');
    });

    this.addListener(copyCmdButton, 'click', () => {
      copyInstallCmd();
    });

    this.addListener(downloadOllamaButton, 'click', () => {
      OllamaInstructions.downloadOllama();
    });

    this.addListener(frameworkSelection, 'click', () => {
     OllamaInstructions.frameworkSelection();
    });

    this.addListener(completeButton, 'click', () => {
      OllamaInstructions.goToModelDownload();
    });
  },

  cleanup() {
    isAlreadyInit = false;
    abortController.abort();
  }
}

export const OllamaInstructions = {
  show() {
    OllamaInstructionsModal.build();
    OllamaInstructionsElems = OllamaInstructionsElems.init();

    if (!isAlreadyInit) {
      EventHandler.init();
      isAlreadyInit = true;
    }

    OllamaInstructionsModal.show();
  },

  destroy() {
    EventHandler.cleanup();

    OllamaInstructionsModal = null;
    NavigationHandler = null;
    EventHandler = null;
  },

  async downloadOllama() {
    await OllamaDownloadLink.open();
  },

  async goToModelDownload() {
    const isConnected = await OllamaConnection.check();

    if (isConnected)
      NavigationHandler.goToModelDownload();

    else {
      NavigationHandler.ollamaInstallFailed(OllamaInstructionsModal);
      OllamaInstructionsModal.hide();
    }

    OllamaInstructionsModal.remove();
    OllamaInstructions.destroy();
  },

  frameworkSelection() {
    OllamaInstructionsModal.hide();
    NavigationHandler.frameworkSelection();
    OllamaInstructions.destroy();
  },
}
