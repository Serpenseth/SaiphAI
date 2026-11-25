import { ChatTab } from '../ChatTab.js';
import { ChatPanel } from '../ChatPanel.js';
import { ObjectUtils } from './ObjectUtils.js';

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

export { LoadHistory };
