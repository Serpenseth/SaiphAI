import { SideBar as Sidebar } from '../components/SideBar.js';

import { FileTab } from '../components/FileTab.js';
import { FloatingWindow } from '../components/FloatingWindow.js';
import { FloatingButtons } from '../components/FloatingButtons.js';

import { ChatPanel } from '../components/ChatPanel.js';
import { ChatTab } from '../components/ChatTab.js';
import { Settings } from '../components/Settings.js';
import { UpdateModal } from '../components/UpdateModal.js';

import {
  StringUtils,
  UuidGenerator,
  DomQuery,
  MarkdownParser,
} from '../utility/utilities.js';

const Config = {
  async save(data) {
    await window.electronAPI.writeToConfigFile(data);
  },
}

const FileHandler = {
  async readFile(filePath) {
    return await window.electronAPI.readFile(filePath);
  },
}

const WorkspaceHandler = {
  async searchWorkspace(searchQuery) {
    return await window.electronAPI.searchWorkspace(searchQuery);
  },
}

const TextSummary = {
  async summarizeText(textToSum, textToInclude) {
    return window.electronAPI.summarizeText(textToSum, textToInclude);
  },
}

const Ui = {
  showMainWindow() {
    DomQuery.toggleVisibility('main-window-ui', true);
  },
}

const EventFunctions = {
  fileTabClickHandler(e) {
    const tab = e.target.closest('.file-tab');
    const closeButton = e.target.closest('.tab-close');

    if (closeButton)
      FileTab.close(tab.id);

    else if (tab) {
      const active = FileTab.getActiveTab();
      FileTab.switchFileTabs(active, tab.id);
    }
  },

  chatTabClickHandler(e) {
    const tab = e.target.closest('.tabAI');
    const closeButton = e.target.closest('.tab-close');

    if (closeButton)
      ChatPanel.closeTab(tab.id);

    else if (tab) {
      const active = ChatTab.getActiveTab();
      ChatPanel.switchToTab(active, tab.id);
    }
  },

  floatingButtonsClickHandler(e) {
    const btnPressed = e.target.closest('.floating-button-action');

    if (!btnPressed)
      return;

    const id = StringUtils.getRawID(btnPressed.id);
    const selected = FloatingButtons.getSelectedText(id);
    const fileTabFile = FileTab.getActiveTabFileName();

    if (btnPressed.id.includes('explain')) {
      FloatingWindow.explainText(btnPressed.id, selected, fileTabFile);
      return;
    }

    else if (btnPressed.id.includes('modify')) {
      const inputID = `suggest-input-${id}`
      const fWindow = FloatingWindow;
      const input = fWindow.getElement(inputID);
      const inputClasses = new Set(input.classList);
      const sendSuggestionBtnID = `send-suggestion-${id}`
      const sendSuggestionBtn = fWindow.getElement(sendSuggestionBtnID);

      FloatingButtons.show(id, false);
      fWindow.show(`floating-window-${id}`, true);
      fWindow.showSendSuggestEdit(id, true);
      fWindow.showThinkingSpinner(id, false);
      input.focus();

      if (!inputClasses.has('initialized')) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            fWindow.clearInputField(id);
            fWindow.showSendSuggestEdit(id, false);
            fWindow.showThinkingSpinner(id, true);
            fWindow.suggestEdit(
              btnPressed.id,
              selected,
              fileTabFile,
              input.value || 'How to improve this?',
            );
          }
        });

        sendSuggestionBtn.addEventListener('click', (e) => {
          e.preventDefault();

          fWindow.clearInputField(id);
          fWindow.showSendSuggestEdit(id, false);
          fWindow.showThinkingSpinner(id, true);
          fWindow.suggestEdit(
            btnPressed.id,
            selected,
            fileTabFile,
            input.value || 'How to improve this?',
          );
        });

        DomQuery.setElementClass(inputID, 'initialized');
      }
    }
  },
}

const EventHandler = {
  setupClickEvents(elems, fn) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);

      if (elem)
        elem.addEventListener('click', fn);
    });
  },
}

const UpdateHandler = {
  data: null,
}

let UpdateEventHandler = {
  registerEvents() {
    window.electronAPI.onUpdateAvailable((data) => {
      UpdateModal.init(this, data).then(_ => UpdateModal.show());
    });

    window.electronAPI.onUpdateError((data) => {
      console.error(data);
    });

    window.electronAPI.onUpdateNotAvailable(async () => {
      console.log('no updates');
      await window.electronAPI.removeUpdateListeners();
      // Remove UpdateModal DOM element
      UpdateModal.remove();
      /* Remove UpdateEventHandler completely,
       * because it isn't needed if no updates are available.*/
      UpdateEventHandler.destroy();
    });
  },

  destroy() {
    UpdateEventHandler = null;
  }
}

const MainWindow = {
  config: null,

  registerEventListeners() {
    EventHandler.setupClickEvents([
      { id: 'file-tabs', fn: (e) => EventFunctions.fileTabClickHandler(e) },
      { id: 'chat-tabs', fn: (e) => EventFunctions.chatTabClickHandler(e) },
      { id: 'tabs-and-editor', fn: (e) => EventFunctions.floatingButtonsClickHandler(e) }
    ]);
  },

  async init(configFile) {
    UpdateEventHandler.registerEvents();
    Settings.init(configFile);

    this.config = configFile;
    this.registerEventListeners();

    Sidebar.init(configFile);
    ChatPanel.init(configFile).then(_ => {
      ChatPanel.newChatTab(configFile.lastTab)
    });
    ChatPanel.show(configFile.showChatPanel);
  },

  show() {
    Ui.showMainWindow();
  },

  displayAiResponse(message) {
    ChatPanel.displayAiResponse(message);
  }
}

export { MainWindow };
