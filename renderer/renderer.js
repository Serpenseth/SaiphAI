import { Intro } from './screens/Intro.js';
import { MainWindow } from './screens/MainWindow.js';
//import { createMainWindow } from './screens/MainWindow.js';

function destroyIntroModal() {
  document.getElementById("intro-model-instructions").remove();
}

function initApp() {
  window.electronAPI.readConfigFile().then(config => {

    if (!config) {
      Intro.show();

      let observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            mutation.removedNodes.forEach((node) => {
              if (node.id === 'ollama-success') {
                setTimeout(() => {
                  observer.disconnect();
                  observer = null;
                  destroyIntroModal();
                }, 200);
              }
            })
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

    }

    else {
      // Remove the intro-related modals, as they are not needed
      destroyIntroModal();
      MainWindow.init(config).then(_ => MainWindow.show());
    }
  });
}

initApp();

