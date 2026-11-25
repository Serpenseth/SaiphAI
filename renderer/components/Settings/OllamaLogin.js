import { DomQuery } from '../../utility/utilities.js';
import { OllamaHandler } from './OllamaHandler.js';

const OllamaLogin = {
  async handle() {
    const { loginMessage, loginError } = await OllamaHandler.login();

    if (loginError) {
      DomQuery.updateText('ollama-login-text', loginError);
    }

    else {
      let isLoggedIn;

      const timeout = setInterval(async () => {
        isLoggedIn = await OllamaHandler.isLoggedInToOllama();

        if (isLoggedIn) {
          const loggedInMsg = 'You are currently logged in to your Ollama account ✔️';
          DomQuery.updateText('ollama-login-text', loggedInMsg);
          DomQuery.showElement('ollama-settings-login', false);
          clearInterval(timeout);
          return;
        }
        else {
          isLoggedIn = null;
        }
      }, 2000);
    }
  },
}

export { OllamaLogin }
