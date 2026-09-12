import { OllamaDetected } from './OllamaDetected.js';

async function getModels() {
  return await window.electronAPI.getOllamaModels();
}

let IntroElements = {
  introModal: null,
  welcomeModal: null,
  getStartedButton: null,
}

function introUI() {
  const div = document.createElement('div');
  div.id = 'welcome-modal';
  div.className = 'modal';
  div.innerHTML = `
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
`;

  return div;
}

let IntroModal = {
  show() {
    const welcomeModal = IntroElements.welcomeModal;

    welcomeModal.style.contentVisibility = '';
    welcomeModal.style.opacity = 1;
    welcomeModal.style.visibility = "visible";
  },

  remove() {
    IntroElements.welcomeModal.remove();
  },

  build() {
    const ui = introUI();
    document.body.prepend(ui);
  },

  initElements() {
    // create the variables
    IntroElements.introModal = document.getElementById('intro-model-instructions');
    IntroElements.welcomeModal = document.getElementById('welcome-modal');
    IntroElements.getStartedButton = document.getElementById('btn-get-started');
  }
}

let NavigationHandler = {
  async handleIntroCompletion(ollamaStatus) {
    if (ollamaStatus.success) {
      const { models } = ollamaStatus;
      OllamaDetected.show(models);
    }
    else {
      const { createFrameworkSelect } = await import('./FrameworkSelection.js');
      const result = createFrameworkSelect();
      result.show();
    }
  }
}

let abortController = new AbortController();

let IntroEventHandler = {
  addListener(element, event, handler) {
    element.addEventListener(event, handler, {
      signal: abortController.signal,
    });
  },

  init() {
    const { getStartedButton } = IntroElements;

    IntroEventHandler.addListener(getStartedButton, 'click', () => {
      getStarted();
    });
  },

  cleanup() {
    abortController.abort();
    abortController = null;
  }
}

async function getStarted() {
  const ollamaStatus = await getModels();
  NavigationHandler.handleIntroCompletion(ollamaStatus);
  Intro.destroy();
}

export let Intro = {
  show() {
    IntroModal.build();
    IntroModal.initElements();
    IntroModal.show();
    IntroEventHandler.init();
  },

  destroy() {
    IntroModal.remove();
    IntroEventHandler.cleanup();

    IntroElements = null;
    IntroModal = null;
    NavigationHandler = null;
    IntroEventHandler = null;
  },
}
