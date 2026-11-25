import { DomQuery } from '../../utility/utilities.js';

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

export { Ui }
