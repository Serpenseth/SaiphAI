//import { createMainWindow } from './screens/MainWindow.js';

class OllamaSuccessUI {
  constructor() {
    this.successModal = document.getElementById("ollama-success");
    this.svgHTML = document.getElementById("checkmark-container");
    this.modalTitle = document.getElementById("success-title");
    this.goBackButton = document.getElementById("go-back-btn");
    this.tryAgainButton = document.getElementById("try-again-btn");
    this.tryAgainMsg = document.getElementById("try-again-msg");
    this.willCloseMsg = document.getElementById("window-will-close");
  }

  _showModal(modal) {
    modal.style.contentVisibility = '';
    modal.style.opacity = 1;
    modal.style.visibility = "visible";
  }

  _hideModal(modal) {
    modal.style.contentVisibility = 'hidden';
    modal.style.opacity = 0;
    modal.style.visibility = "hidden";
  }

  createStatusSVG(status) {
    if (status === "success") {
      this.svgHTML.innerHTML = `<svg class="checkmark-svg" viewBox="0 0 52 52">
      <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
      <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
      </svg>`;
    }

    else {
      this.svgHTML.innerHTML = `<svg class="x-svg" viewBox="0 0 52 52">
      <circle class="x-circle" cx="26" cy="26" r="25" fill="none" />
      <path class="x-line line-1" fill="none" d="M14 14 L38 38" />
      <path class="x-line line-2" fill="none" d="M38 14 L14 38" />
      </svg>`;
    }
  }

  show(status, aiProvider) {
    this._showModal(this.successModal);

    const provider = aiProvider === 'openAI' ? 'OpenAI' : 'Ollama';

    if (status === 'success') {
      this.createStatusSVG('success');
      this.modalTitle.textContent = `${provider} is set. You are ready to go!`;
      this.remove();
    }

    else {
      this.createStatusSVG('failed');
      this.modalTitle.textContent = "Something went wrong. Please try again";
      this.willCloseMsg.style.display = 'none';
      this.tryAgainMsg.removeAttribute('style');
      this.goBackButton.style.display = '';
    }
  }

  async remove(hadError) {
    if (!hadError) {
      let wait = () => new Promise(resolve => setTimeout(resolve, 3000));
      await wait();

      this.svgHTML = null;
      this.successModal.remove();
      wait = null;
    }
    else
      this._hideModal(this.successModal);
  }
}

const NavigationHandler = {
  goBack(prevModal) {
    prevModal.show();
  },

  /*
  completeSetup() {
    const mainWindow = createMainWindow();
    mainWindow.show();
  }
  */
}

class EventHandler {
  constructor(ui, coordinator) {
    this.ui = ui;
    this.coordinator = coordinator;
    this.controller = new AbortController();
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler, { signal: this.controller.signal });
  }

  init() {
    this.addListener(this.ui.goBackButton, 'click', () => {
      this.coordinator.goBack();
    });
  }

  cleanup() {
    this.controller.abort();

    this.ui = null;
    this.coordinator = null;
    this.controller = null;
  }
}

class OllamaSuccess {
  constructor(
    ui,
    state,
    aiProvider = null,
    eventHandler = null,
    prevModal=null,
    navigationHandler=null
  ) {
    this.ui = ui;
    this.state = state;
    this.aiProvider = aiProvider;
    this.eventHandler = null;
    this.prevModal = prevModal;
    this.navigation = navigationHandler;
  }

  async show() {
    this.ui.show(this.state, this.aiProvider);

    if (this.state === 'success') {
      let wait = () => new Promise(resolve => setTimeout(resolve, 200));
      await wait();

      this.destroy();
      wait = null;
    }

    else
      this.eventHandler.init();
  }

  destroy() {
    this.prevModal ? this.ui.remove(true) : this.ui.remove(false);

    this.ui = null;
    this.state = null;
    this.navigation = null;

    if (this.prevModal)
      this.prevModal = null;

    if (this.eventHandler) {
      this.eventHandler.cleanup();
      this.eventHandler = null;
    }
  }

  goBack() {
    this.navigation.goBack(this.prevModal);
    this.destroy();
  }
}

export function createSuccessScreen(state, aiProvider=null, prevModal=null) {
  const ui = new OllamaSuccessUI();
  let ollamaSuccess = null;

  if (state !== 'success') {
    ollamaSuccess = new OllamaSuccess(
      ui,
      state,
      aiProvider,
      null, // eventHandler
      prevModal, // The modal to go back to
      NavigationHandler
    );

    const eventHandler = new EventHandler(ui, null);
    eventHandler.coordinator = ollamaSuccess;
    ollamaSuccess.eventHandler = eventHandler;
  }

  else
    ollamaSuccess = new OllamaSuccess(ui, state, aiProvider);

  return ollamaSuccess;
}

