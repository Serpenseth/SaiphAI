import {
  DomQuery,
  MarkdownParser,
  StringUtils,
} from '../utility/utilities.js';

import { ChatPanel } from './ChatPanel.js';
import { ChatTab } from './ChatTab.js';

const HistoryModalUI = {
  create() {
    return `
      <div class='modal-content-settings' style='flex-direction: row; pointer-events: auto; height: 80%; width: 85%'>
        <button id='close-history' class='close-modal' style='position: absolute; top: 0; right: 0; margin-top: 1rem; margin-right: 1rem;'>X</button>
        <div class="sidebar-container" style='height: 100%'>
          <div class="history-sidebar">
            <h2 style='border-bottom: 1px solid rgba(73, 92, 184, 0.075); padding-bottom: 1rem; padding-left: 0.25rem;'>History</h2>
            <div id='history-list' style='padding-top: 0.5rem;'>
            </div>
          </div>
        </div>
        <div id='preview-chats' class='preview-chats' style='height: 80%; width: 90%; padding-right: 1rem;'>
        </div>
        <div style='display: flex; flex-direction: row; position: absolute; right: 0; bottom: 0; padding-right: 1rem; margin-bottom: 1rem; background: #131415'>
            <button id='delete-history' class="btn btn-delete" style='width: 128px; margin-right: 0.5rem;'>Delete</button>
            <button id='load-history' class="btn btn-primary" style='width: 128px;'>Load</button>
          </div>
      </div>
    `;
  },

  createUserMessageBubble(message) {
    return `
      <div class='history-user-msg-bubble'>
        ${MarkdownParser.parse(message)}
      </div>`;
  },

  createAiResponseUI(text) {
    const parsedText = MarkdownParser.parse(text);

    return `
      <div class='history-ai-response'>
        ${parsedText}
      </div>`;
  },
}

const Ui = {
  show(state) {
    DomQuery.toggleVisibility('history-modal', state);
  },

  build(htmlTemplate) {
    DomQuery.insertHTML('history-modal', htmlTemplate);
  },

  displayUserMessage(message) {
    const bubble = HistoryModalUI.createUserMessageBubble(message);
    const bubbleHTML = DomQuery.htmlTemplateToDOM(bubble);

    DomQuery.appendChild('preview-chats', bubbleHTML);
  },

  displayAiResponse(message) {
    const bubble = HistoryModalUI.createAiResponseUI(message);
    const bubbleHTML = DomQuery.htmlTemplateToDOM(bubble);

    DomQuery.appendChild('preview-chats', bubbleHTML);
  },

  createEntry(title, id) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.id = `history-${id}`;
    item.innerHTML = `
      <div class="history-item-actions" style='display: flex; flex-direction: row'>
        <p>${title || 'Untitled'}</p>
      </div>
      <br>
    `;

    return item;
  },

  appendEntry(chatElement) {
    DomQuery.appendChild('history-list', chatElement);
  },

  removeEntry(id) {
    console.log(id);
    DomQuery.removeElement(id);
    DomQuery.updateInnerHTML('preview-chats', '');
  },

  populateHistory(chatsData) {
    const fragment = new DocumentFragment();
    const chats = chatsData.chats;

    for (let i = 0; i < chats.length; i++) {
      const chat = chats[i];
      const id = chatsData.id[i];
      const item = this.createEntry(chat.title, id);
      fragment.appendChild(item);
    }

    DomQuery.getElement('history-list').appendChild(fragment);
  },

  renderChatHistoryPreview(chatData) {
    DomQuery.updateInnerHTML('preview-chats', '');

    for (let i = 0; i < chatData.user.length; i++) {
      const chat = chatData;
      Ui.displayUserMessage(chat.user[i]);
      Ui.displayAiResponse(chat.system[i]);
    }
  },
}

const CloseHistoryHandler = {
  handleEscClose(e) {
    if (e.key === 'Escape')
      Ui.show(false)
  },

  handleCloseButton() {
    Ui.show(false);
  },
}

const ChatPreview = {
  hovered: null,
}

const ObjectUtils = {
  areSame(obj1, obj2) {
    if (obj1.user.length !== obj2.user.length)
      return false;

    for (let i = 0; i < obj1.user.length; i++) {
      if (obj1.user[i] !== obj2.user[i])
        return false;
    }

    return true;
  },

  alreadyExists(tabID, allObjs) {
    for (let i = 0; i < allObjs.length; i++) {
      if (tabID === allObjs[i][0]) {
        return true;
      }
    }
    return false;
  },
}

const LoadHistory = {
  async handle(historyModal) {
    if (ChatPreview.hovered) {
      if (ChatTab.getTabCount() === 1) {
        historyModal.show(false);
      }

      else {
        const { id, chats, title } = ChatPreview.hovered;
        const active = ChatTab.getActiveTab();
        const activeTabChats = ChatTab.getTabChats(active);

        if (ObjectUtils.areSame(chats, activeTabChats)) {
          historyModal.show(false);
        }

        else {
          const allChats = ChatTab.getAllChats();
          const rawID = ChatTab.getTabRawID(id);

          if (!ObjectUtils.alreadyExists(rawID, allChats)) {
            await ChatPanel.restoreLastTab(id, chats);
          }
          ChatPanel.switchToTab(active, id);
          ChatTab.updateTabTitle(id, title);
          historyModal.show(false);
        }
      }
    }
  },
}

const DeleteHistory = {
  handle(historyModal) {
    const { id, title } = ChatPreview.hovered;
    const response = confirm(`Are you sure you want to delete chat '${title}'?`);

    if (response) {
      ChatPanel.closeTab(id);
      Ui.removeEntry(`history-${id}`);
    }
  },
}

const EventHandler = {
  setupMouseOverEvent(element, data) {
    const el = DomQuery.getElement(element);
    el.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.history-item');

      if (target) {
        const targetID = target.id.replace('history-', '');
        const index = data.id.findIndex(id => id === targetID);
        console.log(target.classList);
        Ui.renderChatHistoryPreview(data.chats[index]);
        ChatPreview.hovered = {
          id: targetID,
          title: data.chats[index].title,
          chats: data.chats[index],
        };
      }
    });
  },

  setupClickEvents(elems, fn) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);

      if (elem)
        elem.addEventListener('click', fn);
    });
  },

  setupKeyPressEvent(fn) {
    document.addEventListener('keydown', fn);
  },
}

const HistoryModal = {
  init(data) {
    Ui.build(HistoryModalUI.create());
    Ui.populateHistory(data);

    EventHandler.setupKeyPressEvent(
      (e) => CloseHistoryHandler.handleEscClose(e),
    );

    EventHandler.setupClickEvents([
      { id: 'close-history', fn: () => Ui.show(false) },
      { id: 'load-history', fn: () => LoadHistory.handle(this) },
      { id: 'delete-history', fn: () => DeleteHistory.handle(this) },
    ]);

    EventHandler.setupMouseOverEvent('history-list', data);
  },

  show(state) {
    Ui.show(state);
  },

  appendEntry(title, id) {
    const chatElement = Ui.createEntry(title, id);
    Ui.appendEntry(chatElement);
  },
}

export { HistoryModal };
