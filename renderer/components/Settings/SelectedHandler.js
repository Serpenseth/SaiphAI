import { DomQuery } from '../../utility/utilities.js';
import { ChatPanel } from '../ChatPanel/ChatPanel.js';
import { SettingsUiHelper as Ui } from './SettingsUiHelper.js';
import { AiBackend, EnvHandler, Config } from './WindowAPI.js';
import { ModelsObject } from './ModelsObject.js';
import { OpenAiModels } from './OpenAiModels.js';
import { DownloadProgressHandler } from './DownloadProgressHandler.js';

const SelectedHandler = {
  async handleSelection() {
    try{
      const isEmpty = await EnvHandler.isOpenAiEnvKeyEmpty();
      const ollamaBadge = DomQuery.getElement('select-ollama-settings');
      const isOllamaSelected = ollamaBadge.disabled === true;
      let selected =  await Config.get();
      selected = selected.selectedModel;

      Ui.setSelectedBadge(isOllamaSelected, !isEmpty);
      Ui.showOllamaDownloadSection(isOllamaSelected);
      Ui.setBorderForSelectedFramework(isOllamaSelected);

      if (isOllamaSelected) {
        // Attach download-related events only when Ollama is selected
        DownloadProgressHandler.setupHandler();
        // Get models
        let models = await AiBackend.getOllamaModels();
        models = ModelsObject.handle(models.models);

        Config.writeToConfig({
          modelFramework:  'ollama',
          ollamaModels: models,
        });

        ChatPanel.populateModelSelector({
          modelFramework: 'ollama',
          ollamaModels: models,
          selectedModel: selected
        });
      }

      else {
        /* Remove download-related events,
        * since OpenAI doesn't use them */
        DownloadProgressHandler.destroy();

        if (!isEmpty) {
          let models;
          if (OpenAiModels.cached.length === 0) {
            models = await AiBackend.getOpenAiModels();
            models = OpenAiModels.handle(models);
            OpenAiModels.cached = models;
          }

          Config.writeToConfig({
            modelFramework:  'openai',
            openaiModels: models || OpenAiModels.cached,
          });

          ChatPanel.populateModelSelector({
            modelFramework: 'openai',
            openaiModels: models || OpenAiModels.cached,
            selectedModel: selected
          });
        }
      }
    }

    catch(e) {
      console.error(e);
    }
  },
}

export { SelectedHandler };
