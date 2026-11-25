import { DomQuery } from '../../utility/utilities.js';
import { OllamaHandler } from './OllamaHandler.js';

const OllamaInstalled = {
  async handle() {
    const ollamaInstalled = await OllamaHandler.isOllamaInstalled();

    if (!ollamaInstalled) {
      DomQuery.updateText('ollama-login-text', 'Ollama is not installed');
    }

    else {
      const isLoggedIn = await OllamaHandler.isLoggedInToOllama();

      if (!isLoggedIn) {
        DomQuery.updateText('ollama-login-text', 'Login to Ollama to use cloud models');
        DomQuery.showElement('ollama-settings-login', true);
      }
      else {
        const loggedInMsg = 'You are currently logged in to your Ollama account ✔️';
        DomQuery.updateText('ollama-login-text', loggedInMsg);
        DomQuery.showElement('ollama-settings-login', false);
      }
    }
  },
}

export { OllamaInstalled }
