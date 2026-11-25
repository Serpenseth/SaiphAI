import { EnvHandler } from './WindowAPI.js';
import { SettingsUiHelper as Ui } from './SettingsUiHelper.js';

const OpenAiLogin = {
  async handle() {
    const isEmpty = await EnvHandler.isOpenAiEnvKeyEmpty();

    if (!isEmpty) {
      Ui.removeOpenAiSpinner()
      Ui.showLoggedIntoOpenAI();
    }
  },
}

export { OpenAiLogin };
