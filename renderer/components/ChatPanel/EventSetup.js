import { Controller } from './Controller.js';
import { ChatPanelUiHelper as Ui } from './ChatPanelUiHelper.js';
import { ResizeManager } from './ResizeManager.js';
import { ModelSelectorHandler } from './ModelSelectorHandler.js';
import { EventHandler } from './EventHandler.js';

const EventSetup = {
  init(rawID, chatPanel) {
    const id = rawID;
    const controller = Controller.add(id);

    EventHandler.setupFilePreview(
      id,
      `attach-file-${id}`,
      controller.signal,
    );

    EventHandler.setupClickEvents([
      { id: 'new-chat-tab', fn: () => chatPanel.newChatTab() },
      { id: `send-chat-${id}`, fn: () => {
        const inputData = Ui.getUserPrompt(`user-prompt-${id}`);
        chatPanel.displayAiResponse(inputData);
        Ui.clearInputFocus(id);
      }},
      controller.signal
    ]);

    EventHandler.setupInputEvent(
      `user-prompt-${id}`,
      (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const inputData = Ui.getUserPrompt(`user-prompt-${id}`);
          chatPanel.displayAiResponse(inputData);
          Ui.clearInputFocus(id);
        }
      },
      controller.signal
    );

    EventHandler.setupResizeHandleEvent(
      `handle-${id}`,
      (e) => {
        e.preventDefault();
        ResizeManager.startResize(e);
      },
      controller.signal
    );

    EventHandler.setupResizeChatAreaEvent(
      `handle-chat-${id}`,
      (e) => {
        e.preventDefault();
        ResizeManager.startResizeChatArea(e);
      },
      controller.signal
    );

    EventHandler.setupModelSelectorEvent(
      `select-model-ai-panel-${id}`,
      (e) => ModelSelectorHandler.handleChange(e),
      controller.signal,
    );
  },
}

export { EventSetup };
