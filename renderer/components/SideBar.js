import { MonacoHighlighter } from './MonacoHighlighter.js';
import { FileTabManager } from './FileTab.js';

import {
  StringUtils,
  DomQuery,
} from '../utility/utilities.js';

import { IndexWorkspaceModal } from './IndexWorkspaceModal.js';

const IndexingService = {
  async index(workspacePath) {
    return await window.electronAPI.indexWorkspace(workspacePath);
  },

  async stop() {
    await window.electronAPI.abortIndexing();
  },
}

const WorkspaceConfig = {
  async getWorkspacePath() {
    const config = await window.electronAPI.readConfigFile();
    return config.workspacePath;
  },

  async setWorkspacePath(workspace)  {
    await window.electronAPI.writeToConfigFile({ workspacePath: workspace });
  },
}

const Config = {
  async saveSidebarVisibility(state) {
    await window.electronAPI.writeToConfigFile({ showSidebar: state });
  },

  async getSidebarVisibility() {
    const config = await window.electronAPI.readConfigFile();
    return config.showSidebar;
  },

  async saveSidebarWidth(width) {
    await window.electronAPI.writeToConfigFile({ sidebarWidth: width });
  },
}

const FileHandler = {
  async loadFileTree(path) {
    return await window.electronAPI.scanFolder(path);
  },

  async readFile(filePath) {
    return await window.electronAPI.readFile(filePath);
  },

  async openWorkspaceFolderChooser() {
    return await window.electronAPI.openFolder();
  },
}

const ExtHandler = {
  convertExtToFullLang(fileExtension) {
    const ext = {
      js: 'javascript',
      py: 'python',
      ts: 'typescript',
      exs: 'elixir',
      sh: 'bash',
      ps1: 'powershell',
      rs: 'rust',
    }

    return ext[fileExtension] ?? fileExtension;
  },
}

const MonacoInstance = {
  async init(tab, file) {
    const contents = await FileHandler.readFile(file);
    const extRaw = StringUtils.getFileExtention(file);
    const ext = ExtHandler.convertExtToFullLang(extRaw);

    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});

    return new Promise((resolve) => {
      require(['vs/editor/editor.main'], () => {
        const instance = monaco.editor.create(tab, {
          value: contents,
          language: ext,
          theme:  'vs-dark',
          automaticLayout: true
        });
        resolve(instance);
      });
    });
  },
}

const ResizeManager = {
  startMouseX: 0,
  startWidth: 0,
  savedWidth: 180,

  startResize(e) {
    const sidebar = DomQuery.getElement('sidebar');
    ResizeManager.startMouseX = e.clientX;
    ResizeManager.startWidth = sidebar.offsetWidth;
    ResizeManager.savedWidth = sidebar.style.width;
  },

  resize(e) {
    const box = DomQuery.getElement('sidebar');
    const minWidth = 180;
    const maxWidth = window.innerWidth * 0.2;

    // Calculate how much the mouse has moved since the click
    const deltaX = e.clientX - ResizeManager.startMouseX;
    let newWidth = ResizeManager.startWidth + deltaX;

    // Clamp the value
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

    box.style.width = newWidth + 'px';
    ResizeManager.savedWidth = box.style.width;
  },

  stopResize() {
    window.removeEventListener('mousemove', ResizeManager.resize);
    window.removeEventListener('mouseup', ResizeManager.stopResize);
  }
}

const Ui = {
  async showSidebar(state) {
    Config.saveSidebarVisibility(state).then(_ => {
      DomQuery.toggleVisibility('file-tree', state);
      DomQuery.showElement('show-sidebar', !state);
      DomQuery.showElement('hide-sidebar', state);

      if (state) {
        const savedWidth = ResizeManager.savedWidth + 'px';
        DomQuery.setWidth('sidebar', savedWidth);
        DomQuery.setWidth('sidebar-container', savedWidth);
        DomQuery.updateText('settings-text', 'Settings');
      }

      else {
        DomQuery.setWidth('sidebar', '40px');
        DomQuery.setWidth('sidebar-container', '40px');
        DomQuery.updateText('settings-text', '');
      }
    });
  },

  removeEmptyMessage() {
    DomQuery.removeElement('sidebar-empty');
  }
}

const FileTree = {
  populate(items, container=null) {
    const target = container || DomQuery.getElement('file-tree');
    target.innerHTML = '';

    for (const item of items) {
      const div = document.createElement('div');
      const isDir = item.isDirectory;

      div.classList.add('file-item');

      if (isDir)
        div.classList.add('directory');

      if (item.name.length > 18)
        div.title = item.name;

      div.dataset.path = item.path.replaceAll('\\', '/').trim();

      const icon = isDir ? '📁' : ''
      const fileIcon = document.createElement('span');

      fileIcon.className = 'file-icon';
      fileIcon.textContent = icon;
      fileIcon.textContent += item.name;

      div.appendChild(fileIcon);
      target.appendChild(div);
    }
  },
}

const Controller = {
  abortController: null,

  init() {
    this.abortController = new AbortController();
  },
}

const EventHandler = {
  setupEvents(elems, fn, abortSignal) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);

      if (elem)
        elem.addEventListener('click', fn, { signal: abortSignal });
    });
  },

  setupResizeEvent(elem, fn, abortSignal) {
    const el = DomQuery.getElement(elem);
    el.addEventListener('mousedown', fn, { signal: abortSignal });
  },
}

const EventFunctions = {
  resize(e) {
    if (DomQuery.getElement('sidebar').style.width === '40px')
      return;

    e.preventDefault();
    ResizeManager.startResize(e);

    window.addEventListener('mousemove', ResizeManager.resize);
    window.addEventListener('mouseup', ResizeManager.stopResize);
  },

  async fileTreeItemClick(e) {
    const item = e.target.closest('.file-item');

    if (!item)
      return;

    if (item.classList.contains('directory')) {
      const path = item.dataset.path;

      // Remove existing children if already open
      const existing = item.nextElementSibling;

      if (existing?.classList.contains('dir-children')) {
        existing.remove();
        return;
      }

      // Create targeted container for children
      const div = document.createElement('div');
      div.className = 'dir-children';

      // Apply styles to the container for nesting
      div.style.paddingLeft = '1rem';
      div.style.borderLeft = '1px solid #242B34';
      div.style.padding =  '0.375rem';
      div.style.marginLeft = '1rem';
      div.style.borderRadius = '0 4px 4px 0px';

      item.after(div);

      FileHandler.loadFileTree(path).then(items => {
        FileTree.populate(items, div);
      });
    }

    else if (!item.classList.contains('directory')) {
      const fullPath = item.dataset.path;
      // const fname = Utility.removeExtension(fullPath);
      //const allTabs = this.coordinator.fileTabManager.getAll();
/*
      for (let [id, tab] of allTabs) {
        if (tab.fileTab.element().textContent.includes(fname)) {
          this.coordinator.mainUI.ui.switchToFileTab(id);
          return
        }
      }*/

      item.classList.add('selected');
      SideBar.getClickedItemInTree(fullPath);
      // await this.coordinator.loadFileContents(fullPath);
    }
  },

  async openWorkspace() {
    const workspace = await FileHandler.openWorkspaceFolderChooser();

    if (workspace) {
      await WorkspaceConfig.setWorkspacePath(workspace);
      await SideBar.populate(workspace);

      SidebarConfig.projectPath = workspace;
      Ui.removeEmptyMessage();

      IndexWorkspaceModal.show(true);
      await IndexingService.index(workspace);
    }
  },

  async stopIndexing() {
    await IndexingService.stop();
    IndexWorkspaceModal.show(false);
    setTimeout(() => alert('Indexing aborted'), 250);
  },
}

const Events = {
  init() {
    EventHandler.setupEvents([
      { id: 'file-tree', fn: (e) => EventFunctions.fileTreeItemClick(e) },
      { id: 'handle-sidebar', fn: (e) => EventFunctions.resize(e) },
      { id: 'open-workspace', fn: () => EventFunctions.openWorkspace() },
      { id: 'abort-index-btn', fn: () => EventFunctions.stopIndexing() },
      { id: 'hide-sidebar', fn: () => Ui.showSidebar(false) },
      { id: 'show-sidebar', fn: () => Ui.showSidebar(true) },
    ]);

    EventHandler.setupResizeEvent(
      'handle-sidebar',
      (e) => EventFunctions.resize(e),
      Controller.abortController.signal,
    );

    window.electronAPI.onIndexingProgress((filePath) => {
      if (filePath)
        DomQuery.getElement('indexing-text').textContent = `${filePath}`;
    });
  },
}

const SidebarConfig = {
  projectPath: null,
  isHidden: false
}

const SideBar = {
  init() {
    Controller.init();
    Events.init();

    Config.getSidebarVisibility().then(shouldShow => {
      Ui.showSidebar(shouldShow);
      SidebarConfig.isHidden = shouldShow;
    });

    WorkspaceConfig.getWorkspacePath().then(path => {
      this.populate(path);
      SidebarConfig.projectPath = path;
    });
  },

  async populate(path) {
    const projectPath = path || SidebarConfig.projectPath;
    const projectContents = await FileHandler.loadFileTree(projectPath);
    FileTree.populate(projectContents);
  },

  getClickedItemInTree(item) {
    return item;
  },

  /*
  async loadFileContents(file) {
    try {
      const mainUI = this.mainUI.ui;
      const currentFileTab = mainUI.currentFileTab;
      const newFileTab = mainUI.newFileTab(file);
      const id = Utility.getRawID(newFileTab.element().id);
      const editorElement = newFileTab.editorElement().element();
      const monacoInstance = await this.service.initMonaco(editorElement, file);
      const floatingButtons = document.getElementById(`floating-buttons-${id}`);
      const highlighter = new MonacoHighlighter(monacoInstance, floatingButtons);

      this.fileTabManager.replace(id, {
        fileName: file,
        fileTab: newFileTab,
        editor: newFileTab.editorElement(),
        monacoID: monacoInstance,
        monacoHighlighter: highlighter
      });

      mainUI.hideAllFileTabs();
      newFileTab.show();
    }
    catch(e) {
      console.error(e.message);
      throw e;
    }
  }
  */
}

export { SideBar }
