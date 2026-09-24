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
    Ui.show('intro-model-instructions');
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
