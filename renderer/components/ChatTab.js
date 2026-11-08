import {
  StringUtils,
  UuidGenerator,
  DomQuery,
} from '../utility/utilities.js';

const ChatTabUi = {
  create(id) {
    return `
      <div id='ai-tab-${id}' class='tabAI' draggable='true'>
        <p id='ai-tab-title-${id}'>Untitled</p>
        <button
          id='btn-close-chat-${id}' class='tab-close' title='Close chat tab'>
        ×
        </button>
      </div>`;
  },
}

const Ui = {
  aiTab: 'ai-tab',

  attachTab(tab) {
    DomQuery.insertHTML('chat-tabs', tab);
  },

  removeTab(rawID) {
    DomQuery.removeElement(`${this.aiTab}-${rawID}`);
  },

  getTab(rawID) {
    return DomQuery.getElement(`${this.aiTab}-${rawID}`);
  },

  updateTabTitle(rawID, newTitle) {
    DomQuery
      .getElement(`${this.aiTab}-${rawID}`)
      .querySelector('p').textContent = newTitle;
  },

  setActiveState(rawID, active) {
    const tab = `ai-tab-${rawID}`;
    active
      ? DomQuery.setElementClass(tab, 'active', true)
      : DomQuery.setElementClass(tab, 'active', false);
  },

  getActiveTab() {
    const active = document.querySelector('.tabAI.active');
    return active?.id;
  },

  getAllTabs() {
    const allOpenedTabs = document.querySelectorAll('.tabAI');
    return Array.from(allOpenedTabs);
  },

  getTabCount() {
    return this.getAllTabs().length;
  },
}

const UserChats = {
  history: new Map(),
}

const ChatsHandler = {
  getChat(id) {
    return UserChats.history.get(id);
  },

  addChat(id, chatData) {
    UserChats.history.set(id, {
      title: chatData.title,
      user: chatData.user,
      system: chatData.system,
    });
  },

  removeChat(id) {
    UserChats.history.delete(id);
  },

  getAllChats() {
    return Array.from(UserChats.history);
  },
}

const TabID = {
  get(fullTabID) {
    return StringUtils.getRawID(fullTabID);
  },
}

const TabHandler = {
  getTabFrom(fullTabID) {
    let prevTabToSwitchTo;
    const allTabs = Ui.getAllTabs();
    const index = allTabs.findIndex(el => el.id === fullTabID);

    return allTabs[index-1].id;
  },
}

const ChatTab = {
  create() {
    const id = UuidGenerator.generate();
    const tab = ChatTabUi.create(id);
    const active = Ui.getActiveTab();

    if (active) {
      Ui.setActiveState(TabID.get(active), false);
    }

    Ui.attachTab(tab);
    ChatsHandler.addChat(id, {
      title: 'Untitled',
      user: [],
      system: []
    });

    Ui.setActiveState(id, true);
  },

  remove(fullTabID) {
    const idOfTabToRemove = TabID.get(fullTabID);
    Ui.removeTab(idOfTabToRemove);
    ChatsHandler.removeChat(idOfTabToRemove);
  },

  switchChatTabs(fromFullID, toFullID) {
    const fromID = TabID.get(fromFullID);
    const toID = TabID.get(toFullID);

    Ui.setActiveState(fromID, false);
    Ui.setActiveState(toID, true);
  },

  removeChatsFromTab(fullTabID) {
    const id = TabID.get(fullTabID);
    ChatsHandler.removeChat(id);
  },

  getFirstTab() {
    return Ui.getAllTabs()[0].id;
  },

  getActiveTab() {
    return Ui.getActiveTab();
  },

  getActiveTabElement() {
    return Ui.getTab(TabID.get(Ui.getActiveTab()));
  },

  getActiveTabRawID() {
    return TabID.get(Ui.getActiveTab());
  },

  getTabRawID(fullTabID) {
    return TabID.get(fullTabID);
  },

  getTabChats(fullTabID) {
    const id = TabID.get(fullTabID);
    const chats = ChatsHandler.getChat(id);

    return chats;
  },

  getTab(fullTabID) {
    const id = TabID.get(fullTabID);
    return Ui.getTab(id);
  },

  getTabFrom(fullTabID) {
    return TabHandler.getTabFrom(fullTabID);
  },

  getTabCount() {
    return Ui.getTabCount();
  },

  addTabToHistory(fullTabID, tabData) {
    const id = TabID.get(fullTabID);
    ChatsHandler.addChat(id, tabData);
  },

  getAllChats() {
    return ChatsHandler.geAllChats();
  },

  getAllTabs() {
    return Ui.getAllTabs();
  },

  updateTabTitle(fullTabID, newTitle) {
    const id = TabID.get(fullTabID);
    Ui.updateTabTitle(id, newTitle);

    const tabData = ChatsHandler.getChat(id);
    tabData.title = newTitle;

    ChatsHandler.addChat(id, tabData);
  },
}

export { ChatTab };


