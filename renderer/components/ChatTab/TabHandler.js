import { Ui } from './Ui.js';

const TabHandler = {
  getTabFrom(fullTabID) {
    let prevTabToSwitchTo;
    const allTabs = Ui.getAllTabs();
    const index = allTabs.findIndex(el => el.id === fullTabID);
    return index === 0 ? allTabs[0].id : allTabs[index-1].id;
  },
}

export { TabHandler };
