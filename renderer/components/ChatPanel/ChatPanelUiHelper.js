import { StringUtils, DomQuery } from '../../utility/utilities.js';
import { ChatPanelUi } from './ChatPanelUi.js';
import { PanelWidth } from './PanelWidth.js';
import { ChatAreaHeight } from './ChatAreaHeight.js';

const ChatPanelUiHelper = {
  showPanel(state) {
    DomQuery.showElement('.ai-panel-container', state);
    DomQuery.showElement('tabs-section', state);
  },

  attachPanel(panelHTML) {
    const html = DomQuery.htmlTemplateToDOM(panelHTML);
    html.firstElementChild.style.width = PanelWidth.get();

    const chatArea = html.querySelector('.chat-input');
    chatArea.style.height = ChatAreaHeight.get();

    DomQuery.appendChild('.ai-panel-container', html);
  },

  removePanel(fullTabID) {
    const id = StringUtils.getRawID(fullTabID);
    DomQuery.removeElement(`ai-panel-${id}`);
  },

  clearChatbox(fullTabID) {
    const id = StringUtils.getRawID(fullTabID);
    DomQuery.updateInputValue(`user-prompt-${id}`, '');
  },

  clearChats(fullTabID) {
    const id = StringUtils.getRawID(fullTabID);
    DomQuery.updateInnerHTML(`chat-content-${id}`, '');
  },

  scrollToBottom(fullTabID) {
    const id = StringUtils.getRawID(fullTabID);
    const chatArea = DomQuery.getElement(`chat-content-${id}`);

    chatArea.scrollTop = chatArea.scrollHeight;
  },

  displayThinkingDiv(fullTabID) {
    const id = StringUtils.getRawID(fullTabID);
    const thinkingDiv = ChatPanelUi.createThinkingDiv(id);
    const thinkingDivHTML = DomQuery.htmlTemplateToDOM(thinkingDiv);

    DomQuery.appendChild(`chat-content-${id}`, thinkingDivHTML);
    this.scrollToBottom(fullTabID);
  },

  displayUserMessage(fullTabID, message) {
    const id = StringUtils.getRawID(fullTabID);
    const bubble = ChatPanelUi.createUserMessageBubble(message);
    const bubbleHTML = DomQuery.htmlTemplateToDOM(bubble);

    DomQuery.removeElement(`panel-msg-${id}`);
    DomQuery.appendChild(`chat-content-${id}`, bubbleHTML);
    this.scrollToBottom(fullTabID);
  },

  displayAiResponse(fullTabID, message) {
    const id = StringUtils.getRawID(fullTabID);
    const bubble = ChatPanelUi.createAiResponseUI(message);
    const bubbleHTML = DomQuery.htmlTemplateToDOM(bubble);

    DomQuery.appendChild(`chat-content-${id}`, bubbleHTML);
    this.scrollToBottom(fullTabID);
  },

  displayErrorMessage(fullTabID, message) {
    const id = StringUtils.getRawID(fullTabID);
    const bubble = ChatPanelUi.createErrorBubble(message);
    const bubbleHTML = DomQuery.htmlTemplateToDOM(bubble);

    DomQuery.removeElement(`panel-msg-${id}`);
    DomQuery.appendChild(`chat-content-${id}`, bubbleHTML);
    this.scrollToBottom(fullTabID);
  },

  removeThinkingDiv(fullTabID) {
    const id = StringUtils.getRawID(fullTabID);
    return DomQuery.removeElement(`thinking-${id}`);
  },

  getUserPrompt(fullTabID) {
    const id = StringUtils.getRawID(fullTabID);
    return DomQuery.getElement(`user-prompt-${id}`).value.trim();
  },

  renderPreviousChatsForTab(fullTabID, chats) {
    for (let i = 0; i < chats.user.length; i++) {
      ChatPanelUiHelper.displayUserMessage(fullTabID, chats.user[i]);
      ChatPanelUiHelper.displayAiResponse(fullTabID, chats.system[i]);
    }
  },

  clearInputFocus(id) {
    DomQuery.getElement(`user-prompt-${id}`).blur();
  },
}

export { ChatPanelUiHelper };
