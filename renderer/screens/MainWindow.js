import { SideBar as Sidebar } from '../components/SideBar.js';

import { FileTab } from '../components/FileTab.js';
import { FloatingWindow } from '../components/FloatingWindow.js';
import { FloatingButtons } from '../components/FloatingButtons.js';

import { ChatPanel } from '../components/ChatPanel.js';
import { ChatTab } from '../components/ChatTab.js';

import {
  StringUtils,
  UuidGenerator,
  DomQuery,
  MarkdownParser,
} from '../utility/utilities.js';

const Backend = {
  async saveData(data) {
    await window.electronAPI.writeToConfigFile(data);
  },

  async readFile(filePath) {
    return await window.electronAPI.readFile(filePath);
  },

  async searchWorkspace(searchQuery) {
    return await window.electronAPI.searchWorkspace(searchQuery);
  },

  async summarizeText(textToSum, textToInclude) {
    return window.electronAPI.summarizeText(textToSum, textToInclude);
  },
}

class MainWindowUI {
  constructor() {
    this.mainWindowUI = document.getElementById('main-window-ui');
    this.tabsAndEditorParent = document.getElementById('tabs-and-editor');
    this.fileTabsContainer = document.getElementById('file-tabs');
    this.chatTabsContainer = document.getElementById('chat-tabs');

    this.chatPanel = null;
    this.currentFileTab = null;
  }

  init() {
    ChatPanel.newChatTab();
  }

  show() {
    this.mainWindowUI.style.contentVisibility = '';
    this.init();
  }

  //===> Chat tab logic <===//
  removeChatTab(id) {
    ChatPanel.closeTab(`ai-tab-${id}`);
  }

  switchToChatTab(id) {
    ChatPanel.switchToTab(id);
  }

  displayErrorMessageInFloatingWindow(id, error) {
    const rawID = StringUtils.getRawID(id);
    const thinkingDiv = this.chatPanel.getThinkingDiv(rawID);

    if (thinkingDiv)
      thinkingDiv.remove();

    const bubble = document.createElement('div');
    bubble.className = "error-msg-bubble";
    bubble.textContent = "Error: " + error;

    if (!fromFloatingWindow) {
      const chatArea = this.chatPanel.getChatHistoryContainer(rawID);
      chatArea.appendChild(bubble);
      this.scrollToBottom(rawID);
    }

    else {
      floatingWindowManager
        .get(rawID)
        .element()
        .appendChild(bubble);
    }
  }

  createLoadingDivInFloatingWindow(id, defaultText=true) {
    const rawID = StringUtils.getRawID(id);
    const floatingWindow = floatingWindowManager.get(rawID);

    const thinkingDiv = document.createElement("div");
    const thinkingMsg = document.createElement("p");
    const spinner = document.createElement("div");

    thinkingDiv.style.display = "flex";
    thinkingDiv.style.flexDirection = "row";
    thinkingDiv.id = `thinking-${rawID}`;
    thinkingMsg.className = "secondary-text";
    spinner.className = "loading";

    defaultText ?
      thinkingMsg.textContent = "Analyzing selected text..."
      : thinkingMsg.textContent = "Thinking..."

    thinkingDiv.appendChild(spinner);
    thinkingDiv.appendChild(thinkingMsg);


    floatingWindow.element().appendChild(thinkingDiv);
    return thinkingDiv;
  }

  //===> File tab logic <===//
  newFileTab(fileName) {
    FileTab.create(fileName);
  }
}

class EventHandler {
  constructor(ui, coordinator) {
    this.ui = ui;
    this.coordinator = coordinator;
    this.controller = new AbortController();
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler, {
      signal: this.controller.signal,
    });
  }

  init() {
    const fileTabsContainer = DomQuery.getElement('file-tabs');

    this.addListener(fileTabsContainer, 'click', (e) => {
      const tab = e.target.closest('.file-tab');
      const closeButton = e.target.closest('.tab-close');

      if (closeButton)
        this.coordinator.removeFileTab(tab.id);

      else if (tab)
        this.coordinator.switchToFileTab(tab.id);
    });

    const chatTabsContainer = this.ui.chatTabsContainer;

    this.addListener(chatTabsContainer, 'click', (e) => {
      const tab = e.target.closest('.tabAI');
      const closeButton = e.target.closest('.tab-close');

      if (closeButton)
        this.coordinator.closeChatTab(StringUtils.getRawID(tab.id));

      else if (tab)
        this.coordinator.switchToChatTab(tab.id);
    });

    /*
    this.addListener(this.ui.tabsAndEditorParent, 'click', async (e) => {
      let rawID = null;
      let floatingWindow = null;
      const buttonPressed = e.target.closest('.floating-button-action');

      if (!buttonPressed)
        return;

      if (buttonPressed.id.includes('explain')) {
        try {
          rawID = StringUtils.getRawID(buttonPressed.id);
          const floatingButtons = floatingButtonsManager.get(rawID);
          const fileTab = fileTabManager.get(rawID).fileTab;

          floatingWindow = floatingWindowManager.get(rawID);
          floatingButtons.hide();
          floatingWindow.show();

          await this.coordinator.explainText(
            //this.ui.currentFileTab.editor,
            fileTab.editorElement().element().id,
            floatingButtons.getSelectedText(),
            fileTabManager.get(rawID).fileName
          );

        }
        catch(e) {
          console.error(e);
          floatingWindow.setContent(e);
        }
      }

      else if (buttonPressed.id.includes('modify')) {
        const rawID = StringUtils.getRawID(buttonPressed.id);
        const activeEditor = DomQuery.getElement(`editor-container-${rawID}`);

        const activeFloatingWindow = floatingWindowManager.get(rawID);
        let inputField = DomQuery.getElement(`suggest-input-${rawID}`);

        if (!inputField) {
          activeFloatingWindow.createSendChangeField();
          inputField = DomQuery.getElement(`suggest-input-${rawID}`);
        }

        else {
          const cont = DomQuery.getElement(`suggest-input-container-${rawID}`);
          cont.style.display = 'block';
        }

        activeFloatingWindow.show();
        floatingButtonsManager.get(rawID).hide();

        inputField.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            const value = inputField.value.trim();

            if (value !== '') {
              this.coordinator.suggestEdit(activeEditor.id, value);
            }
          }
        });

        const suggestionBtn = DomQuery.getElement(`send-suggestion-${rawID}`);
        suggestionBtn.addEventListener('click', () => {
          const value = inputField.value.trim();

          if (value !== '') {
            this.coordinator.suggestEdit(
              activeEditor.id,
              inputField.value.trim()
            );
          }
        });
      }
    });
    */

  }
}

class MainWindow {
  constructor(
    backend,
    ui,
    eventHandler,
    config
  ) {
    this.service = backend;
    this.ui = ui;
    this.eventHandler = eventHandler;
    this.config = config;
  }

  async init() {
    this.eventHandler.init();
    Sidebar.init();

    if (this.config.showChatPanel)
      ChatPanel.show(true);

    else
      ChatPanel.show(false);
  }

  async show() {
    await this.init();
    this.ui.show();
  }

  newChatTab() {
    ChatPanel.newChatTab();
  }

  closeChatTab(id) {
    ChatPanel.closeTab(`ai-tab-${id}`);
  }

  switchToChatTab(id) {
    ChatPanel.switchToTab(id);
  }

  switchToFileTab(id) {
    const active = FileTab.getActiveTab();
    FileTab.switchFileTabs(active, id);
  }

  removeFileTab(id) {
    FileTab.close(id);
  }

  displayAiResponse(message) {
    ChatPanel.displayAiResponse(message);
  }
}

export function createMainWindow(config) {
  const ui = new MainWindowUI();
  const eventHandler = new EventHandler(ui, null);

  //const sidebar = createSidebar(fileTabManager);
  const mainWindow = new MainWindow(
    Backend,
    ui,
    eventHandler,
    //Sidebar,
    config
  );

  eventHandler.coordinator = mainWindow;
  //sidebar.mainUI = mainWindow;

  return mainWindow;
}

