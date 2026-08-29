import { createIntroScreen } from './screens/Intro.js';
import { createMainWindow } from './screens/MainWindow.js';

async function initApp() {
  const config = await window.electronAPI.readConfigFile();

  if (!config) {
    let intro = createIntroScreen();
    intro.show();

    let observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node.id === 'ollama-success') {
              setTimeout(() => {
                //intro.destroy();

                window.electronAPI.readConfigFile()
                  .then(config => {
                    document.getElementById('intro-model-instructions').remove();

                    const mainWindow = createMainWindow(config);
                    mainWindow.show();

                    observer.disconnect();
                    observer = null;
                    intro = null;
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
    document.getElementById("welcome-modal").remove();
    document.getElementById("intro-model-instructions").remove();

    const mainWindow = createMainWindow(config);
    mainWindow.show();
  }
}

initApp();

