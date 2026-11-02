import {
  DomQuery,
  StringUtils,
  MarkdownParser,
  UuidGenerator,
} from '../utility/utilities.js';

import { FloatingWindow } from './FloatingWindow.js';
import { FloatingButtons } from './FloatingButtons.js';
import { FileEditor } from './FileEditor.js';

const FileTabUI = {
  create(id, fullPath) {
    const tab = document.createElement('div');
    tab.className = 'file-tab';
    tab.id = `file-tab-${id}`;
    tab.dataset.path = fullPath;
    tab.classList.add('active');

    const title = document.createElement('p');
    const fname = StringUtils.getFileName(fullPath);
    title.innerHTML = fname;
    title.id = `file-tab-title-${id}`;

    const closeTabButton = document.createElement('button');
    closeTabButton.className = 'tab-close';
    closeTabButton.title = 'Close file';
    closeTabButton.id = `btn-close-file-${id}`;
    closeTabButton.textContent = '×';

    tab.appendChild(title);
    tab.appendChild(closeTabButton);

    return tab;
  },
}

const Ui = {
  attachTab(tab) {
    DomQuery.appendChild('file-tabs', tab);
  },

  removeTab(rawID) {
    DomQuery.removeElement(`file-tab-${rawID}`);
  },

  getTab(rawID) {
    return DomQuery.getElement(`file-tab-${rawID}`);
  },

  updateTabTitle(rawID, newTitle) {
    DomQuery.updateText(`file-tab-title-${rawID}`, newTitle);
  },

  setActiveState(rawID, active) {
    const tab = `file-tab-${rawID}`;
    active
      ? DomQuery.setElementClass(tab, 'active', true)
      : DomQuery.setElementClass(tab, 'active', false);
  },

  getActiveTab() {
    const active = document.querySelector('.file-tab.active');
    return active?.id;
  },

  getAllTabs() {
    return document.querySelectorAll('.file-tab');
  },

  getTabCount() {
    return Ui.getAllTabs().length;
  },

  getTabFilePath(rawID) {
    return Ui.getTab(rawID).dataset.path;
  },

  getFirstTab() {
    return Ui.getAllTabs()[0];
  },
}

const TabID = {
  get(fullTabID) {
    return StringUtils.getRawID(fullTabID);
  },
}

const FileTabManager = {
  tabAlreadyExists(filePath) {
    const allTabs = Ui.getAllTabs();

    for (let i = 0; i < allTabs.length; i++) {
      const tab = allTabs[i];

      if (tab.dataset.path.trim() === filePath.trim())
        return true;
    };

    return false;
  },

  getTabByFilePath(filePath) {
    const allTabs = Array.from(Ui.getAllTabs());
    const index = allTabs.findIndex(item => {
      return item.dataset.path === filePath
    });

    return allTabs[index].id;
  },
}

const SidebarActiveFile = {
  setActiveState(id, state) {
    const filePath = Ui.getTabFilePath(id);
    let allActiveFiles = document.querySelectorAll('.file-item.selected');
    allActiveFiles = Array.from(allActiveFiles);

    for (const item of allActiveFiles) {
      if (item.dataset.path.trim() === filePath) {
        item.classList.toggle('selected', state);
      }
    }
  },
}


const TabHandler = {
  getTabFrom(fullTabID) {
    let prevTabToSwitchTo;
    const allTabs = Array.from(Ui.getAllTabs());
    const index = allTabs.findIndex(el => el.id === fullTabID);

    return allTabs[index-1].id;
  },
}

const FileTabCreation = {
  init(fullPath) {
    const count = Ui.getTabCount();

     if (count > 0) {
      const active = Ui.getActiveTab();
      const oldID = TabID.get(active);
      const currentTabFile = Ui.getTabFilePath(oldID);

      Ui.setActiveState(oldID, false);
      FileEditor.show(`editor-container-${oldID}`, false);
    }

    const id = UuidGenerator.generate();
    const editor = FileEditor.create(id, fullPath);
    FileEditor.show(editor.id, true);

    const tab = FileTabUI.create(id, fullPath);
    Ui.attachTab(tab);

    return tab;
  },
}

const FileTab = {
  create(fullPath) {
    return FileTabCreation.init(fullPath);
  },

  tabAlreadyExists(filePath) {
    const res = FileTabManager.tabAlreadyExists(filePath);
    return res;
  },

  close(fullTabID) {
    const id = TabID.get(fullTabID);
    const tabCount = Ui.getTabCount();
    SidebarActiveFile.setActiveState(id, false);

    if (tabCount === 1) {
      FileEditor.destroy(id);
      Ui.removeTab(id);
      return;
    }

    else {
      const activeTabRawID = TabID.get(Ui.getActiveTab());

      if (id === activeTabRawID) {
        const prevTab = TabHandler.getTabFrom(fullTabID);
        const prevTabRawID = TabID.get(prevTab);

        this.switchFileTabs(id, prevTabRawID);
      }
    }

    FileEditor.destroy(id);
    Ui.removeTab(id);
  },

  switchFileTabs(fromFullID, toFullID) {
    const fromID = TabID.get(fromFullID);
    const toID = TabID.get(toFullID);

    Ui.setActiveState(fromID, false);
    Ui.setActiveState(toID, true);

    FileEditor.show(`editor-container-${fromID}`, false);
    FileEditor.show(`editor-container-${toID}`, true);
    FloatingWindow.show(fromFullID, false);
    FloatingWindow.show(toFullID, true);
  },

  getActiveTab() {
    return Ui.getActiveTab();
  },

  getActiveTabRawID() {
    return TabID.get(Ui.getActiveTab());
  },

  getTabByFilePath(filePath) {
    return FileTabManager.getTabByFilePath(filePath);
  },

  getActiveTabFileName() {
    const activeRaw = this.getActiveTabRawID();
    return Ui.getTabFilePath(activeRaw);
  },
}

export { FileTab };
