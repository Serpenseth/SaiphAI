import { createMainWindow } from './MainWindow.js';

import { DomQuery } from '../utility/utilities.js';

const AnimatedSvg = {
  show(status) {
    if (status === "success") {
      return `<svg class="checkmark-svg" viewBox="0 0 52 52">
      <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
      <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
      </svg>`;
    }

    else {
      return `<svg class="x-svg" viewBox="0 0 52 52">
      <circle class="x-circle" cx="26" cy="26" r="25" fill="none" />
      <path class="x-line line-1" fill="none" d="M14 14 L38 38" />
      <path class="x-line line-2" fill="none" d="M38 14 L14 38" />
      </svg>`;
    }
  }
}

const OllamaSuccessModal = {
  ui(status, aiProvider) {
    const h2Msg = this._createH2Message(status, aiProvider);

    return `
      <div id='ollama-success' style='content-visibility: hidden'>
        <h2 id="success-title">${h2Msg}</h2>
        <br>
        <div class="checkmark-container" id="checkmark-container">
          ${AnimatedSvg.show(status)}
        </div>
        ${this._createWindowWillClose(status)}
        ${this._createTryAgainMessage(status)}
        ${this._createBackButton(status)}
      </div>`;
  },

  _createWindowWillClose(state) {
    return state === 'success'
      ? `<p id="window-will-close" class="subtitle">
            This window will close automatically in 3 seconds
          </p>`
      : '';
  },

  _createH2Message(state, aiProvider) {
    return state === 'success'
      ? `${aiProvider} is set. You are ready to go!`
      : 'Something went wrong. Please try again';
  },

  _createTryAgainMessage(state) {
    return state !== 'success'
      ? `<p id="try-again-msg" class="subtitle">
          Ollama has not been installed successfully, or it's not running.<br>
          Please make sure Ollama is running, and try again
        </p>`
      : '';
  },

  _createBackButton(state) {
    return state !== 'success'
      ? `<div id='ollama-check-failed-btns' class="btn-bottom-container">
            <button id="go-back-btn" style: "display: flex;" class="btn btn-secondary modal-nav-button">
              Go back
            </button>
          </div>`
      : '';
  },
}

const NavigationHandler = {
  goBack(prevModal) {
    prevModal.show();
  },

  completeSetup() {
    createMainWindow().show();
  }
}

const Ui = {
  elements: null,

  load(uiElem, htmlContent) {
    // Check if HTML has already been inserted
    if (DomQuery.getElement('ollama-success')) {
      return;
    }

    DomQuery.insertHTML(uiElem, htmlContent);
  },

  show(ollamaSuccess) {
    DomQuery.toggleVisibility(ollamaSuccess, true);
  },

  hide(ollamaSuccess) {
    DomQuery.toggleVisibility(ollamaSuccess, false);
  },

  destroy(ollamaSuccess) {
    DomQuery.removeElement(ollamaSuccess);
  },
}

const EventHandler = {
  abortController: new AbortController(),
  isInit: false,

  setupEvent(element, fn) {
    if (!this.isInit) {
      const el = DomQuery.getElement(element);

      if (el) {
        el.addEventListener('click', fn, {
          signal: this.abortController.signal
        });
      }

      this.isInit = true;
    }
  },

  destroy() {
    this.abortController.abort();
    this.isInit = false;
  }
}

let OllamaSuccess = {
  registerEventListeners(state, lastModal) {
    if (state === 'success') {
      setTimeout(() => { this.remove(); }, 3000);
      NavigationHandler.completeSetup();
    }

    else {
      EventHandler.setupEvent('go-back-btn', () => {
        Ui.hide('ollama-success');
        NavigationHandler.goBack(lastModal);
      });
    }
  },

  show(state, aiProvider, lastModal=null) {
    Ui.load('modal-content', OllamaSuccessModal.ui(state, aiProvider));
    Ui.show("ollama-success");
    this.registerEventListeners(state, lastModal);
  },

  remove() {
    Ui.destroy('ollama-success');
  }
}

export { OllamaSuccess };
