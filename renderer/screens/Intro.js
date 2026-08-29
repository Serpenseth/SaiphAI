//import { OllamaSuccess } from './OllamaSuccess.js';
//import { NoModels } from './NoModels.js';

//import { OllamaDetected } from './OllamaDetected.js';
//import { FrameworkSelection } from './FrameworkSelection.js';
//import { OllamaInstructions } from './OllamaInstructions.js';

import { createOllamaScreen } from './OllamaDetected.js';
import { createOllamaInstructionsScreen } from './OllamaInstructions.js';

const OllamaBackend = {
  async getModels() {
    return await window.electronAPI.getOllamaModels();
  }
}

class IntroUI {
  constructor() {
    this.introModal = document.getElementById('intro-model-instructions');
    this.welcomeModal = document.getElementById('welcome-modal');
    this.getStartedButton = document.getElementById('btn-get-started');
  }

  _showModal(modal) {
    modal.style.contentVisibility = '';
    modal.style.opacity = 1;
    modal.style.visibility = "visible";
  }

  show() {
    this._showModal(this.introModal);
    this._showModal(this.welcomeModal);
  }

  remove() {
    this.welcomeModal.remove();
  }
}

const NavigationHandler = {
  async handleIntroCompletion(ollamaStatus) {
    if (ollamaStatus.success) {
      const { models } = ollamaStatus;
      const ollamaDetected = createOllamaScreen(models);
      ollamaDetected.show();
    }
    else {
      const { createFrameworkSelect } = await import('./FrameworkSelection.js');
      const result = createFrameworkSelect();
      result.show();
    }
  }
}

class IntroEventHandler {
  constructor(ui, coordinator) {
    this.ui = ui;
    this.coordinator = coordinator;
    this.controller = new AbortController();
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler, { signal: this.controller.signal });
  }

  init() {
    this.addListener(this.ui.getStartedButton, 'click', () => {
      this.coordinator.getStarted();
    });
  }

  remove() {
    this.controller.abort();
    this.ui.remove();

    this.ui = null;
    this.coordinator = null;
  }

  cleanup() {
    this.controller.abort();
  }
}

class Intro {
  constructor(backend, ui, navigationHandler, eventHandler) {
    this.service = backend;
    this.ui = ui;
    this.navigationHandler = navigationHandler;
    this.eventHandler = eventHandler;
  }

  show() {
    this.eventHandler.init();
    this.ui.show();
  }

  destroy() {
    this.eventHandler.cleanup();
    this.ui.remove();

    this.service = null;
    this.ui = null;
    this.navigationHandler = null;
    this.eventHandler = null;
  }

  async getStarted() {
    const ollamaStatus = await this.service.getModels();
    this.navigationHandler.handleIntroCompletion(ollamaStatus);
    this.destroy();
  }
}

export function createIntroScreen() {
  const ui = new IntroUI();
  const navigationHandler = NavigationHandler;
  const eventHandler = new IntroEventHandler(ui, null);
  const intro = new Intro(OllamaBackend, ui, navigationHandler, eventHandler);

  eventHandler.coordinator = intro;

  return intro;
}
