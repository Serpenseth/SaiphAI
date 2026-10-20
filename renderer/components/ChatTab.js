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
}

const ChatTabState = {
  setActive(rawID, active) {
    const tab = `ai-tab-${rawID}`;
    active
      ? DomQuery.setElementClass(tab, 'active', true)
      : DomQuery.setElementClass(tab, 'active', false);
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
      slot: chatData.slot,
      title: chatData.title,
      user: chatData.user,
      system: chatData.system,
    });
  },

  removeChat(id) {
    UserChats.history.delete(id);
  },

  getAllChats() {
    return UserChats.history;
  },

  lastChat() {
    return Array.from(UserChats.history.entries()).pop();
  },

  getChatBySlot(slot) {
    for (const [key, value] of UserChats.history) {
      if (value.slot === slot)
        return UserChats.history.get(key);
    }

    return null;
  },

  getChatIDBySlot(slot) {
    for (const [key, value] of UserChats.history) {
      if (value.slot === slot)
        return key;
    }

    return null;
  },
}

const ChatTabManager = {
  active: null,

  setActiveTab(id) {
    this.active = id;
  }
}

const TabID = {
  get(fullTabID) {
    return StringUtils.getRawID(fullTabID);
  },
}

const ChatTab = {
  create() {
    const id = UuidGenerator.generate();
    const tab = ChatTabUi.create(id);
    const prev = ChatTabManager.active;

    Ui.attachTab(tab);
    ChatTabState.setActive(id, true);

    if (prev) {
      const oldID = TabID.get(prev);
      ChatTabState.setActive(oldID, false);
    }

    let lastChat;

    if (prev)
      lastChat = ChatsHandler.lastChat();

    ChatsHandler.addChat(id, {
      slot: !lastChat ? 0 : lastChat[1].slot + 1,
      title: 'Untitled',
      user: [],
      system: []
    });
    ChatTabManager.setActiveTab(`ai-tab-${id}`);
  },

  remove(fullTabID) {
    const id = TabID.get(fullTabID);
    Ui.removeTab(id);
    ChatsHandler.removeChat(id);
  },

  removeChatsFromTab(fullTabID) {
    const id = TabID.get(fullTabID);
    ChatsHandler.removeChat(id);
  },

  setActiveTab(fullTabID) {
    const oldID = TabID.get(ChatTabManager.active);
    ChatTabState.setActive(oldID, false);

    ChatTabManager.setActiveTab(fullTabID);

    const id = TabID.get(fullTabID);
    ChatTabState.setActive(id, true);
  },

  getLastTabChatEntry() {
    return ChatsHandler.lastChat();
  },

  getTabChatBySlot(slot) {
    return ChatsHandler.getChatBySlot(slot);
  },

  getTabChatIDBySlot(slot) {
    return ChatsHandler.getChatIDBySlot(slot);
  },

  getActiveTab() {
    return ChatTabManager.active;
  },

  getActiveTabElement() {
    return Ui.getTab(TabID.get(ChatTabManager.active));
  },

  getActiveTabRawID() {
    return TabID.get(ChatTabManager.active);
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

  getTabCount() {
    return ChatsHandler.getAllChats().size;
  },

  addTabToHistory(fullTabID, tabData) {
    const id = TabID.get(fullTabID);
    ChatsHandler.addChat(id, tabData);
  },

  getAllChats() {
    return ChatsHandler.geAllChats();
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


