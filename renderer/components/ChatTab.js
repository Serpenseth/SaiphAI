class ChatTabManager {
  constructor() {
    this.chats = new Map();
  }

  get(id) {
    return this.chats.get(id);
  }

  create(id, chatTab) {
    this.chats.set(id, {
      title: 'Untitled',
      chatTab: chatTab,
      user: [],
      system: []
    });
    return this;
  }

  replace(id, newChatTab) {
    this.chats.set(id, {
      title: newChatTab.title,
      chatTab: newChatTab.chatTab,
      user: newChatTab.user,
      system: newChatTab.system
    });
  }

  add(id, history) {
    const chat = this.chats.get(id);

    chat.user = [];
    chat.system = [];

    history.forEach(entry => {
      entry.role === 'user'
        ? chat.user.push(entry.content)
        : chat.system.push(entry.content);
    });

    this.chats.set(id, chat);
    return this;
  }

  remove(id) {
    //this.chats.get(id).chatTab.remove();
    this.chats.delete(id);
  }

  getPreviousChat(id) {
    let previous = null;

    for (const [key, value] of this.chats) {
      if (key === id)
        return previous;

      previous = value;
    }

    return null;
  }

  getAllChats() {
    return this.chats;
  }
}

class ChatTab {
  constructor(id, chatTabManager) {
    this.id = id;
    this.chatTab = null;

    this.create();
  }

  create() {
    const tab = document.createElement('div');
    tab.className = 'tabAI';
    tab.id = `ai-tab-${this.id}`;
    tab.draggable = true;

    const title = document.createElement('p');
    title.textContent = 'Untitled';
    title.id = `ai-tab-title-${this.id}`;

    const closeTabButton = document.createElement('button');
    closeTabButton.className = 'tab-close';
    closeTabButton.title = 'Close tab';
    closeTabButton.id = `btn-close-chat-${this.id}`;
    closeTabButton.textContent = '×';

    tab.appendChild(title);
    tab.appendChild(closeTabButton);
    tab.draggable = true;

    this.chatTab = tab;
    return this;
  }

  remove() {
    this.chatTab.remove();
  }

  updateTabTitle(title) {
    this.chatTab.querySelector('p').textContent = title
    //this.chatTab.textContent = title;
  }
/*
  switchToTab(id) {
    this.chatTab.classList.remove('active');

    const clickedTab = document.getElementById(id);
    clickedTab.classList.add('active');
  }*/

  element() {
    return this.chatTab;
  }
}

export { ChatTabManager, ChatTab }


