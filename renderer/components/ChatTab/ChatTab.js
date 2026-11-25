import { StringUtils, UuidGenerator, DomQuery } from '../../utility/utilities.js';
import { ChatTabUi } from './ChatTabUi.js';
import { Ui } from './Ui.js';
import { ChatsHandler } from './ChatsHandler.js';
import { TabHandler } from './TabHandler.js';

const TabID = {
  get(fullTabID) {
    return StringUtils.getRawID(fullTabID);
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

  createFromID(fullTabID) {
    const id = TabID.get(fullTabID);
    const tab = ChatTabUi.create(id);

    /*
    const active = Ui.getActiveTab();
    if (active) {
      Ui.setActiveState(TabID.get(active), false);
    }
    */

    Ui.attachTab(tab);
  },

  setActive(id, state) {
    Ui.setActiveState(id, state);
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
    return ChatsHandler.getAllChats();
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


