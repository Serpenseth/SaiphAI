import { EnvHandler } from './Settings/WindowAPI.js';
import { SettingsModal } from './Settings/SettingsModal.js';
import { SettingsUiHelper as Ui } from './Settings/SettingsUiHelper.js';
import { DownloadProgressHandler } from './Settings/DownloadProgressHandler.js';
import { OllamaLogin } from './Settings/OllamaLogin.js';
import { OllamaInstalled } from './Settings/OllamaInstalled.js';
import { OpenAiHandler } from './Settings/OpenAiHandler.js';
import { OpenAiLogin } from './Settings/OpenAiLogin.js';
import { CloseSettingsHandler } from './Settings/CloseSettingsHandler.js';
import { SelectedHandler } from './Settings/SelectedHandler.js';
import { EventHandler } from './Settings/EventHandler.js';
import { AbortButtonHandler } from './Settings/AbortButtonHandler.js';
import { DownloadButtonHandler } from './Settings/DownloadButtonHandler.js';

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
