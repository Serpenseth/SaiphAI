function createStatusSVG(status) {
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

function OllamaSuccessUI(status, aiProvider) {
  const h2Msg = status === 'success'
    ? `${aiProvider} is set. You are ready to go!`
    : 'Something went wrong. Please try again';

  const showGoBackBtn = status !== 'success'
    ? `<div id='ollama-check-failed-btns' class="btn-bottom-container">
          <button id="go-back-btn" style: "display: flex;" class="btn btn-secondary modal-nav-button">
            Go back
          </button>
        </div>`
    : '';


  const div = document.createElement('div');
  div.id = 'ollama-success';
  div.style.contentVisibility = 'hidden';

  div.innerHTML = `
    <h2 id="success-title">${h2Msg}</h2>
    <br>
    <div class="checkmark-container" id="checkmark-container">
      ${createStatusSVG(status)}
    </div>
    <p id="window-will-close" class="subtitle" style='display: none'>
      This window will close automatically in 3 seconds
    </p>
    <p id="try-again-msg" class="subtitle" style="content-visibility: hidden;">
      Ollama has not been installed successfully, or it's not running.<br>
      Please make sure Ollama is running, and try again
    </p>
    ${showGoBackBtn}
  `;

  return div;
}

async function wait(timeInMs) {
  return new Promise(resolve => setTimeout(resolve, timeInMs));
}

let OllamaSuccessElems = {
  successModal: null,
  svgHTM: null,
  modalTitle: null,
  goBackButton: null,
  tryAgainButton: null,
  tryAgainMsg: null,
  willCloseMsg: null,
}

let OllamaSuccessModal = {
  show() {
    const { successModal } = OllamaSuccessElems;

    successModal.style.contentVisibility = '';
    successModal.style.opacity = 1;
    successModal.style.visibility = "visible";
  },

  hide() {
    const { successModal } = OllamaSuccessElems;

    successModal.style.contentVisibility = 'hidden';
    successModal.style.opacity = 0;
    successModal.style.visibility = "hidden";
  },

  build(status, aiProvider) {
    const ui = OllamaSuccessUI(status, aiProvider);
    document.getElementById('modal-content').appendChild(ui);
  },

  initElements() {
    OllamaSuccessElems = {
      successModal: document.getElementById("ollama-success"),
      svgHTM: document.getElementById("checkmark-container"),
      modalTitle: document.getElementById("success-title"),
      goBackButton: document.getElementById("go-back-btn"),
      tryAgainButton: document.getElementById("try-again-btn"),
      tryAgainMsg: document.getElementById("try-again-msg"),
      willCloseMsg: document.getElementById("window-will-close"),
    }
  },

  async remove(hadError) {
    const { successModal } = OllamaSuccessElems;

    if (!hadError) {
      await wait(3000);
      successModal.remove();
    }
    else
      OllamaSuccessModal.hide(successModal);
  },
}

let NavigationHandler = {
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

let abortController = new AbortController();
let isEventHandlerInit = false;

let EventHandler = {
  addListener(element, event, handler) {
    element.addEventListener(event, handler, {
      signal: abortController.signal,
    });
  },

  init() {
    const { goBackButton } = OllamaSuccessElems;
    isEventHandlerInit = true;

    this.addListener(goBackButton, 'click', () => {
      OllamaSuccess.goBack();
    });
  },

  cleanup() {
    abortController.abort();
    isEventHandlerInit = false;
  }
}

let prevModal = null;

export let OllamaSuccess = {
  async show(state, aiProvider) {
    OllamaSuccessModal.build(state, aiProvider);
    OllamaSuccessModal.initElements();
    OllamaSuccessModal.show();

    if (state === 'success') {
      await wait(200);
      OllamaSuccess.destroy();

      return;
    }

    EventHandler.init();
  },

  destroy() {
    prevModal
      ? OllamaSuccessModal.remove(true)
      : OllamaSuccessModal.remove(false);

    OllamaSuccessModal = null;
    NavigationHandler = null;

    if (prevModal)
      prevModal = null;

    if (isEventHandlerInit)
      EventHandler.cleanup();
  },

  goBack() {
    NavigationHandler.goBack(prevModal);
    OllamaSuccess.destroy();
  }
}
