import { DomQuery } from '../../utility/utilities.js';
import { AiBackend } from './WindowAPI.js';
import { SettingsUiHelper as Ui } from './SettingsUiHelper.js';
import { ModelDownloadManager } from './ModelDownloadManager.js';

const DownloadButtonHandler = {
  async handleDownloadButtonClick() {
    const inputField = DomQuery.getElement('settings-model-to-pull');
    const modelName = inputField.value;

    let userModels = await AiBackend.getOllamaModels();
    userModels = userModels.models;
    const userHasModel = userModels.some(model => {
      return model.name === modelName;
    });

    if (modelName.trim() !== '') {
      if (userHasModel) {
        Ui.showModelAlreadyInstalled(modelName);
        return;
      }

      ModelDownloadManager.downloadModel(modelName);
    }
  },
}

export { DownloadButtonHandler };
