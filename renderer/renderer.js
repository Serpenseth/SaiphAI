import { Intro } from './screens/Intro.js';
import { createMainWindow } from './screens/MainWindow.js';

function destroyIntroModal() {
  document.getElementById("intro-model-instructions").remove();
}

async function initApp() {
  const config = await window.electronAPI.readConfigFile();

  if (!config) {
    Intro.show();

    let observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node.id === 'ollama-success') {
              setTimeout(() => {
                window.electronAPI.readConfigFile()
                  .then(config => {
                    const mainWindow = createMainWindow(config);
                    mainWindow.show();

                    observer.disconnect();
                    observer = null;
                    destroyIntroModal();
                  });
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

    const mainWindow = createMainWindow(config);
    mainWindow.show();
  }
}

initApp();

