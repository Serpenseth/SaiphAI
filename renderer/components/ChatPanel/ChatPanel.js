import { DomQuery } from '../../utility/utilities.js';

import {
  AiBackend,
  ChatStorage,
  Config,
  Workspace,
} from './WindowAPI.js';

import { ChatPanelUi } from './ChatPanelUi.js';
import { ChatPanelUiHelper as Ui } from './ChatPanelUiHelper.js';
import { Controller } from './Controller.js';
import { EventHandler } from './EventHandler.js';
import { EventSetup } from './EventSetup.js';
import { AttachedFilesHandler } from './AttachedFiles.js';
import { AiResponse } from './AiResponse.js';
import { ModelSelector } from './ModelSelector.js';
import { ChatStorageObject } from './ChatStorageObject.js';

import { ChatTab } from '../ChatTab.js';
import { HistoryModal } from '../History.js';

const ChatPanelData = {
  config: null,
}

const ChatPanel = {
  async init(configFile) {
    ChatPanelData.config = configFile;

    const lastTab = configFile.lastTab;
    const allTabs = await ChatStorage.getAll();
    const prevTabs = ChatStorageObject.handle(allTabs);
    HistoryModal.init(prevTabs);

    switch(prevTabs.chats.length) {
      case 0:
        ChatPanel.newChatTab();
        break;

      case 1:
        ChatPanel.restoreLastTab(lastTab);
        break;

      default:
        ChatPanel.restoreAllChats(prevTabs, lastTab);
        break;
    }
  },

  async show(shouldShow) {
    Ui.showPanel(shouldShow);

    const state = DomQuery.getElement('.ai-panel-container').style.display === 'none';

    shouldShow !== true
      ? DomQuery.updateText('show-ai-panel-text', 'Show AI Panel')
      : DomQuery.updateText('show-ai-panel-text', 'Hide AI Panel');

    await Config.saveToConfig({ showChatPanel: shouldShow });
  },

  createEvents(rawID) {
    EventSetup.init(rawID, this);
  },

  async restoreLastTab(tabID, prevChats=null) {
    const defaultChatObject = {
      title: 'Untitled',
      user: [],
      system: []
    }
    const chats = prevChats || await ChatStorage.get(tabID)  || defaultChatObject;
    const tabCount = ChatTab.getTabCount();
    const id = ChatTab.getTabRawID(tabID);

    ChatTab.createFromID(tabID);

    const newPanel = ChatPanelUi.create(id);
    Ui.attachPanel(newPanel);

    if (chats)
      Ui.renderPreviousChatsForTab(tabID, chats);

    this.createEvents(id);
    ChatTab.setActive(id, true);
    ModelSelector.populate(ChatPanelData.config, id);
    ChatTab.addTabToHistory(id, chats);
    ChatTab.updateTabTitle(id, chats.title);
  },

  async restoreAllChats(prevTabs, lastTab) {
    for (let i = 0; i < prevTabs.chats.length; i++) {
      const id = prevTabs.id[i];
      const chats = prevTabs.chats[i];
      const rawID = ChatTab.getTabRawID(id);

      ChatTab.createFromID(id);

      const newPanel = ChatPanelUi.create(rawID);
      Ui.attachPanel(newPanel);
      this.createEvents(rawID);

      if (id !== lastTab) {
        DomQuery.showElement(`ai-panel-${rawID}`, false);
        ChatTab.setActive(rawID, false);
      }

      else {
        DomQuery.showElement(`ai-panel-${rawID}`, true);
        ChatTab.setActive(rawID, true);
      }

      Ui.renderPreviousChatsForTab(rawID, chats);
      ModelSelector.populate(ChatPanelData.config, rawID);
      ChatTab.addTabToHistory(id, chats);
      ChatTab.updateTabTitle(id, chats.title);
    }
  },

  async newChatTab() {
    const tabCount = ChatTab.getTabCount();

    if (tabCount !== 0) {
      const oldID = ChatTab.getActiveTabRawID();
      DomQuery.showElement(`ai-panel-${oldID}`, false);
    }

    ChatTab.create();
    const id = ChatTab.getActiveTabRawID();
    const newPanel = ChatPanelUi.create(id);

    Ui.attachPanel(newPanel);
    this.createEvents(id);

    ModelSelector.populate(ChatPanelData.config, id);
    Config.save({ lastTab: `ai-tab-${id}` });

    const tabs = DomQuery.getElement('chat-tabs');
    tabs.scrollLeft = tabs.scrollWidth;
  },

  switchToTab(fromFullID, toFullID) {
    const fromID = ChatTab.getTabRawID(fromFullID);
    const toID = ChatTab.getTabRawID(toFullID);

    DomQuery.showElement(`ai-panel-${fromID}`, false);
    DomQuery.showElement(`ai-panel-${toID}`, true);

    ChatTab.switchChatTabs(fromFullID, toFullID);
    Config.save({ lastTab: toFullID });
  },

  clearChats(fullTabID) {
    Ui.clearChats(fullTabID);
  },

  async closeTab(fullTabID) {
    const tabCount = ChatTab.getTabCount();
    const id = ChatTab.getTabRawID(fullTabID);

    if (tabCount === 1) {
      ChatTab.addTabToHistory(id, {
        title: 'Untitled',
        user: [],
        system: []
      });

      Ui.clearChatbox(id);
      Ui.clearChats(id);
      ChatTab.updateTabTitle(id, 'Untitled');
      ChatStorage.remove(fullTabID);
      await Config.save({ lastTab: fullTabID });
      return;
    }

    else {
      if (id === ChatTab.getActiveTabRawID()) {
        const prevTab = ChatTab.getTabFrom(fullTabID);

        Controller.abort(ChatTab.getTabRawID(fullTabID));
        this.switchToTab(fullTabID, prevTab);
        await Config.save({ lastTab: fullTabID });
      }
    }

    Ui.removePanel(fullTabID);
    ChatTab.remove(fullTabID);
    ChatStorage.remove(fullTabID);
  },

  populateModelSelector(data) {
    const id = ChatTab.getActiveTabRawID();
    ModelSelector.populate(data, id);
  },

  async displayAiResponse(message) {
    if (!message || message.length === 0)
      return;

    const id = ChatTab.getActiveTab();
    const chats = ChatTab.getTabChats(id);

    const title = message.substring(0, 12);
    const rawID = ChatTab.getTabRawID(id);

    Ui.clearChatbox(id);
    Ui.displayUserMessage(id, message);
    Ui.displayThinkingDiv(id);

    if (chats.title === 'Untitled' && chats.user.length === 0)
      ChatTab.updateTabTitle(id, title);

    let searchQuery = await Workspace.search(message);
    let msgWithWorkspace;
    const resultsFound = searchQuery.length > 0;

    if (resultsFound) {
      searchQuery = JSON.stringify(searchQuery);
      msgWithWorkspace = `User message: ${message}`;
      msgWithWorkspace = `${msgWithWorkspace}\n\nIndexed project: ${searchQuery}`;
    }

    const attachedFiles = AttachedFilesHandler.handleAttachedFiles(rawID);

    try {
      const aiReply = await AiResponse.generate(
        ChatPanelData.config,
        chats,
        msgWithWorkspace || message,
        attachedFiles
      );

      Ui.removeThinkingDiv(id);

      const aiMsg = aiReply.message.content;
      Ui.displayAiResponse(id, aiMsg);
      chats.system.push(aiMsg);

      ChatTab.addTabToHistory(id, {
        title: title,
        user: chats.user,
        system: chats.system,
      });

      ChatStorage.save(id, chats);

      setTimeout(() => {
        ChatStorage.getAll()
          .then(allChats => {
            const prevTabs = ChatStorageObject.handle(allChats);
            HistoryModal.populateHistory(prevTabs);
          });
      }, 250);
    }
    catch(e) {
      console.error(e);
      Ui.removeThinkingDiv(id);
      Ui.displayErrorMessage(id, e);
    }
  },
}

export { ChatPanel };
