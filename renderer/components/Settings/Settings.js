import { EnvHandler } from './WindowAPI.js';
import { SettingsModal } from './SettingsModal.js';
import { SettingsUiHelper as Ui } from './SettingsUiHelper.js';
import { DownloadProgressHandler } from './DownloadProgressHandler.js';
import { OllamaLogin } from './OllamaLogin.js';
import { OllamaInstalled } from './OllamaInstalled.js';
import { OpenAiHandler } from './OpenAiHandler.js';
import { OpenAiLogin } from './OpenAiLogin.js';
import { CloseSettingsHandler } from './CloseSettingsHandler.js';
import { SelectedHandler } from './SelectedHandler.js';
import { EventHandler } from './EventHandler.js';
import { AbortButtonHandler } from './AbortButtonHandler.js';
import { DownloadButtonHandler } from './DownloadButtonHandler.js';

const Settings = {
  eventSetup() {
    EventHandler.setupKeyPressEvent(
      (e) => CloseSettingsHandler.handleEscClose(e),
    );

    EventHandler.setupClickEvents([
      { id: 'ollama-settings-login', fn: () => OllamaLogin.handle() },
      { id: 'verify-openai-key-settings', fn: () => OpenAiHandler.login() },
      { id: 'select-ollama-settings', fn: () => SelectedHandler.handleSelection() },
      { id: 'select-openai-settings', fn: () => SelectedHandler.handleSelection() },
      { id: 'close-settings-modal', fn: () => CloseSettingsHandler.handleCloseButton() },
      { id: 'dl-ollama-model-settings', fn: () => DownloadButtonHandler.handleDownloadButtonClick() },
      { id: 'abort-ollama-model-dl-settings', fn: () => AbortButtonHandler.handleAbort() },
    ]);
  },

  async init(config) {
    Ui.build(SettingsModal.ui());

    Promise.all([
      OllamaInstalled.handle(),
      OpenAiLogin.handle()
    ]);

    const isOllama = config.modelFramework === 'ollama';
    const isEmpty = await EnvHandler.isOpenAiEnvKeyEmpty();

    Ui.setSelectedBadge(isOllama, !isEmpty);
    Ui.setBorderForSelectedFramework(isOllama);
    Ui.showOllamaDownloadSection(isOllama);

    if (isOllama) {
      DownloadProgressHandler.setupHandler();
    }

    this.eventSetup();
  },

  show(state) {
    Ui.show(state);
  },
}

export { Settings };
