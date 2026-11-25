import { DomQuery } from '../../utility/utilities.js';
import { EnvHandler } from './WindowAPI.js';
import { KeyHandler } from './KeyHandler.js';
import { SettingsUiHelper as Ui } from './SettingsUiHelper.js';

const OpenAiHandler = {
  async login() {
    const inputField = DomQuery.getElement('openai-acc-settings');

    if (inputField.value === '')
      return;

    Ui.showOpenAiSpinner(true);

    const { success, errorMsg } = await KeyHandler.verifyKey(inputField.value);

    if (!success) {
      Ui.updateOpenAiErrMsg(errorMsg);
      Ui.showOpenAiSpinner(false);
    }

    else {
      EnvHandler.writeToEnv('OPENAI_KEY', inputField.value);
      Ui.removeOpenAiSpinner();
      Ui.showLoggedIntoOpenAI();
      DomQuery.showElement('select-openai-settings', true);
    }
  },
}

export { OpenAiHandler };
