import { createOllamaScreen } from './OllamaDetected.js';
import { createOllamaInstructionsScreen } from './OllamaInstructions.js';

const Backend = {
  async getOllamaModels() {
    return await window.electronAPI.getOllamaModels();
  }
}

class FrameworkSelectionUI {
  constructor() {
    this.frameworkSelection = document.getElementById('model-selection');
    this.optionOpenai = document.getElementById("option-openai");
    this.optionOllama = document.getElementById("option-ollama");
  }

  _showModal(modal) {
    modal.style.contentVisibility = '';
    modal.style.opacity = 1;
    modal.style.visibility = "visible";
  }

  show() {
    this._showModal(this.frameworkSelection);
  }

  remove() {
    this.frameworkSelection.remove();
  }

  hide() {
    this.frameworkSelection.style.contentVisibility = 'hidden';
  }
}

const NavigationHandler = {
  async ollamaOption(ollamaStatus) {
    if (ollamaStatus.success) {
      const { models } = ollamaStatus;
      const ollamaScreen = createOllamaScreen(models);
      ollamaScreen.show();
    }

    else {
      const result = createOllamaInstructionsScreen();
      result.show();
    }
  },
  async openaiOption() {
    const { createOpenAiScreen } = await import('./OpenAIModal.js');
    const result = createOpenAiScreen();
    result.show();
  },
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
    this.addListener(this.ui.optionOllama, 'click', (ollamaStatus) => {
      this.coordinator.useOllama(ollamaStatus);
    });

    this.addListener(this.ui.optionOpenai, 'click', () => {
      this.coordinator.useOpenai();
    });
  }

  cleanup() {
    this.controller.abort();
  }
}

class FrameworkSelection {
  constructor(backend, ui, navigationHandler, eventHandler) {
    this.service = backend;
    this.ui = ui;
    this.navigation = navigationHandler;
    this.eventHandler = eventHandler;
  }

  show() {
    this.ui.show();
    this.eventHandler.init();
  }

  destroy() {
    this.eventHandler.cleanup();

    this.service = null;
    this.ui = null;
    this.navigation = null;
    this.eventHandler = null;
  }

  async useOllama() {
    const ollamaStatus = await this.service.getOllamaModels();
    await this.navigation.ollamaOption(ollamaStatus);

    // DOM element shouldn't be removed, it is hidden instead
    this.ui.hide();
    this.destroy();
  }

  async useOpenai() {
    await this.navigation.openaiOption();

    // DOM element shouldn't be removed, it is hidden instead
    this.ui.hide();
    this.destroy();
  }
}

export function createFrameworkSelect() {
  const ui = new FrameworkSelectionUI();
  const eventHandler = new EventHandler(ui, null);

  const frameworkSelection = new FrameworkSelection(
    Backend,
    ui,
    NavigationHandler,
    eventHandler,
  );

  eventHandler.coordinator = frameworkSelection;

  return frameworkSelection;
}

