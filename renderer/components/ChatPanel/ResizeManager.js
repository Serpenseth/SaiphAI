import { DomQuery } from '../../utility/utilities.js';
import { PanelWidth } from './PanelWidth.js';
import { ChatTab } from '../ChatTab/ChatTab.js';


const ResizeManager = {
  startMouseX : 0,
  startWidth : 0,
  startMouseYChat : 0,
  startHeightChat : 0,

  startResize(e) {
    const currentPanel = `ai-panel-${ChatTab.getActiveTabRawID()}`;
    const box = DomQuery.getElement(currentPanel);
    ResizeManager.startMouseX = e.clientX;
    ResizeManager.startWidth = box.offsetWidth;
  },

  resize(e) {
    const currentPanel = `ai-panel-${ChatTab.getActiveTabRawID()}`;
    const box = DomQuery.getElement(currentPanel);
    const minWidth = 396;
    const maxWidth = window.innerWidth * 0.875;

    const deltaX = e.clientX - ResizeManager.startMouseX;
    let newWidth = ResizeManager.startWidth - deltaX;

    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    box.style.width = newWidth + 'px';

    // Set width for all panels
    const allPanels = document.querySelectorAll('.ai-panel');
    for (const panel of allPanels) {
      panel.style.width = box.style.width;
    }

    PanelWidth.set(box.style.width);
    DomQuery.getElement('chat-tabs').style.width = box.style.width;
  },


  stopResize() {
    window.removeEventListener('mousemove', ResizeManager.resize);
    window.removeEventListener('mouseup', ResizeManager.stopResize);
  },

  startResizeChatArea(e) {
    const currentPanel = `user-prompt-${ChatTab.getActiveTabRawID()}`;
    const box = DomQuery.getElement(currentPanel);
    ResizeManager.startMouseYChat = e.clientY;
    ResizeManager.startHeightChat = box.offsetHeight;
  },

  resizeChatArea(e) {
    const currentPanel = `user-prompt-${ChatTab.getActiveTabRawID()}`;
    const box = DomQuery.getElement(currentPanel);
    const minHeight = 70;
    const maxHeight = window.innerHeight * 0.7;
    const deltaY = e.clientY - ResizeManager.startMouseYChat;
    let newHeight = ResizeManager.startHeightChat - deltaY;

    newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
    box.style.height = newHeight + 'px';

    const allChatArea = document.querySelectorAll('.chat-input');
    for (const chatArea of allChatArea) {
      ca.style.height = box.style.height;
    }

    ChatAreaHeight.set(box.style.height);
  },

  stopResizeChatArea() {
    window.removeEventListener('mousemove', ResizeManager.resizeChatArea);
    window.removeEventListener('mouseup', ResizeManager.stopResizeChatArea);
  },
}

export { ResizeManager };
