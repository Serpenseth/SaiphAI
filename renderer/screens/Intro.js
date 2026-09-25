import { OllamaDetected } from './OllamaDetected.js';
import { FrameworkSelection } from './FrameworkSelection.js';

import { DomQuery } from '../utility/utilities.js';

const OllamaBackend = {
  async getModels() {
    return window.electronAPI.getOllamaModels();
  }
}

const IntroModal = {
  ui() {
    return `
      <div id="welcome-modal" class="modal">
        <div class="modal-content">
          <h1>Welcome to SaiphAI!</h1>
          <p class="subtitle-intro">Your Coding Workspace... Smarter</p>
            <div class="intro-text">
              SaiphAI helps you work with your code. It can read your projects, find bugs, build applications, and more!
              <div class="btn-bottom-container">
                <button id="btn-get-started" class="btn btn-primary modal-nav-button">
                  Get Started
                </button>
            </div>
          </div>
        </div>
      </div>`;
  }
}

const NavigationHandler = {
  handleContinue(ollamaStatus) {
    ollamaStatus.success
      ?  OllamaDetected.show(ollamaStatus.models)
      : FrameworkSelection.show();
  },
}

const Ui = {
  load(htmlContent) {
    DomQuery.insertHTML(document.body, htmlContent);
  },

  show(introModal) {
    DomQuery.toggleVisibility(introModal, true);
  },

  hide(introModal) {
    DomQuery.toggleVisibility(introModal, false);
  },

  destroy(introModal) {
    DomQuery.removeElement(introModal);
  },
}

const Controller = {
  abortController: new AbortController(),

  abort() {
    this.abortController.abort();
  },
}

const EventHandler = {
  setupEvent(element, fn, abortSignal) {
    const el = DomQuery.getElement(element);

    if (el) {
      el.addEventListener('click', fn, { signal: abortSignal });
    }
  },

  destroy(abortSignal) {
    abortSignal.abort();
  },
}

const Intro = {
  registerEventListener() {
    EventHandler.setupEvent(
      'btn-get-started',
      () => this.getStarted(),
      Controller.abortController.signal
    )
  },

  show() {
    Ui.load(IntroModal.ui());
    Ui.show('welcome-modal');
    this.registerEventListener();
  },

  destroy() {
    Ui.destroy('welcome-modal');
    EventHandler.destroy(Controller.abortController);
  },

  async getStarted() {
    const ollamaStatus = await getModels();
    NavigationHandler.handleIntroCompletion(ollamaStatus);
    this.destroy();
  }
}

export { Intro };

