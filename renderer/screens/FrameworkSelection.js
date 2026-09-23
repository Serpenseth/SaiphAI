// import { createOllamaScreen } from './OllamaDetected.js';
// import { createOllamaInstructionsScreen } from './OllamaInstructions.js';

import { OllamaDetected } from './OllamaDetected.js';
import { OllamaInstructions } from './OllamaInstructions.js';

import { DomQuery } from '../utility/utilities.js';

const OllamaBackend = {
  async getModels() {
    return window.electronAPI.getOllamaModels();
  }
}

const FrameworkSelectionModal = {
  ui() {
    return `
      <div id="model-selection" class="intro-text" style="content-visibility: hidden">
        <h1>AI preference</h1>
        <h3>Click on which AI framework you want to use</h3>
        <div class="model-options">
          <!-- OpenAI  -->
          <div class="model-card" id="option-openai">
            <img
              src="../assets/OpenAI-white-monoblossom.png"
              style="height: 65px; width: 65px; align-item: self;"
            >
            <h2 style="margin-top: 0.85rem">OpenAI</h2>
            <p class="secondary-text">
              OpenAI is an AI research and deployment company that builds advanced machine-learning models and tools (e.g., the GPT and DALL·E families)
            </p>
          </div>
          <!-- Ollama  -->
          <div class="model-card" id="option-ollama">
            <!-- <div class="badge">Advanced</div> -->
            <img
              src="https://ollama.com/public/assets/c889cc0d-cb83-4c46-a98e-0d0e273151b9/42f6b28d-9117-48cd-ac0d-44baaf5c178e.png"
              style="height: 48px; width: 48px; align-item: self; margin-top: 0.55rem;"
            >
            <h2 style="margin-top: 1em">Ollama</h2>
            <p class="secondary-text">Full-powered local/cloud open-source AI models.</p>
            <p>System requirements vary on model's size</p><br>
            <p>Minimum requirements for a 1B to 4B model: GTX 1650 or Apple M1 and 8 GB of RAM</p>
          </div>
        </div>
        <p class="subtitle" style="margin-bottom: -1em;">
          <b>Note</b>: If you have Ollama installed, make sure that it's running before selecting Ollama
        </p>
        <br>
        <p class="subtitle" style="margin-bottom: -1.7em; color: #f59e0b; font-size: 0.7em">
          SaiphAI is not endorsed by, sponsored by, or partnered with OpenAI or Ollama in any way.
        </p>
      </div> `;
  }
}

const NavigationHandler = {
  ollamaOption(ollamaStatus) {
    ollamaStatus.success
      ? OllamaDetected.show(ollamaStatus.models)
      : OllamaInstructions.show();
  },

  async openaiOption() {
    const { createOpenAiScreen } = await import('./OpenAIModal.js');
    const result = createOpenAiScreen();
    result.show();
  },
}

const Ui = {
  elements: null,

  load(uiElem, htmlContent) {
    // Check if HTML has already been inserted
    if (DomQuery.getElement('model-selection')) {
      return;
    }

    DomQuery.insertHTML(uiElem, htmlContent);
  },

  show(modelSelection) {
    DomQuery.toggleVisibility(modelSelection, true);
  },

  hide(modelSelection) {
    DomQuery.toggleVisibility(modelSelection, false);
  },

  destroy(modelSelection) {
    DomQuery.removeElement(modelSelection);
  },
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

  destroy() {
    this.abortController.abort();
    this.isInit = false;
  }
}

const FrameworkSelection = {
  registerEventListeners() {
    EventHandler.setupEvents([
      { id: 'option-ollama', fn: () => this.ollamaOption() },
      { id: 'option-openai', fn: () => this.openaiOption() },
    ]);
  },

  show() {
    Ui.load('modal-content', FrameworkSelectionModal.ui());
    Ui.show('model-selection');
    this.registerEventListeners();
  },

  hide() {
    Ui.hide('model-selection');
  },

  destroy() {
    Ui.destroy('model-selection');
  },

  ollamaOption() {
    OllamaBackend.getModels().then(models => {
      this.hide();
      NavigationHandler.ollamaOption(models);
    });
  },

  openaiOption() {
    this.hide();
    NavigationHandler.openaiOption();
  },
}

export { FrameworkSelection };

/*
const Backend = {
  async getOllamaModels() {
    return await window.electronAPI.getOllamaModels();
  }
}*/

/* class FrameworkSelectionUI {
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
}*/

/*
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
}*/

/* class FrameworkSelection {

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
}*/
