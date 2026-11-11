import {
  StringUtils,
  DomQuery,
} from '../utility/utilities.js';

import { IndexWorkspaceModal } from './IndexWorkspaceModal.js';
import { FileEditor } from './FileEditor.js';
import { FileTab } from './FileTab.js';
import { ChatPanel } from './ChatPanel.js';
import { Settings } from './Settings.js';

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

  async openWorkspaceFolderChooser() {
    return await window.electronAPI.openFolder();
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
    const prevAiPanelState = DomQuery.getElement('.ai-panel-container').style.display === 'none'
    const prevText = prevAiPanelState !== true
      ? 'Show AI Panel'
      :  'Hide AI Panel';

    Config.saveSidebarVisibility(state).then(_ => {
      DomQuery.toggleVisibility('file-tree', state);
      DomQuery.showElement('show-sidebar', !state);
      DomQuery.showElement('hide-sidebar', state);

      if (state) {
        const savedWidth = ResizeManager.savedWidth + 'px';
        DomQuery.setWidth('sidebar', savedWidth);
        DomQuery.setWidth('sidebar-container', savedWidth);
        DomQuery.updateText('settings-text', 'Settings');
        DomQuery.updateText('open-workspace-text', 'Open workspace');
        DomQuery.updateText('show-ai-panel-text', prevText);
      }

      else {
        DomQuery.setWidth('sidebar', '40px');
        DomQuery.setWidth('sidebar-container', '40px');
        DomQuery.updateText('settings-text', '');
        DomQuery.updateText('open-workspace-text', '');
        DomQuery.updateText('show-ai-panel-text', '');
      }
    });
  },

  removeEmptyMessage() {
    DomQuery.removeElement('sidebar-empty');
  },
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
      div.id = isDir ? '' : div.name;

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

  setupShowAiPanelShortcut(fn, abortSignal) {
    document.addEventListener('keydown', fn, { signal: abortSignal });
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
      const alreadyOpened = FileTab.tabAlreadyExists(fullPath);

      if (!alreadyOpened) {
        FileTab.create(fullPath);
        item.classList.add('selected');
      }

      else {
        const active = FileTab.getActiveTab();
        const itemFileTab = FileTab.getTabByFilePath(fullPath);
        FileTab.switchFileTabs(active, itemFileTab);
      }
    }
  },

  async openWorkspace() {
    const workspace = await FileHandler.openWorkspaceFolderChooser();

    if (workspace) {
      await WorkspaceConfig.setWorkspacePath(workspace);
      await SideBar.populate(null, workspace);

      Ui.removeEmptyMessage();

      IndexWorkspaceModal.show(true);
      await IndexingService.index(workspace);
    }
  },

  openSettings() {
    Settings.show(true);
  },

  async stopIndexing() {
    await IndexingService.stop();
    IndexWorkspaceModal.show(false);
    setTimeout(() => alert('Indexing aborted'), 250);
  },

  showChatPanel(e) {
    if (e)
      e.preventDefault();

    const state = DomQuery.getElement('.ai-panel-container').style.display === 'none';
    ChatPanel.show(state);

    const isSidebarHidden = DomQuery.getWidth('.sidebar') === '40px'

    if (isSidebarHidden)  {
      DomQuery.updateText('show-ai-panel-text', '');
      return;
    }

    state !== true
      ? DomQuery.updateText('show-ai-panel-text', 'Show AI Panel')
      : DomQuery.updateText('show-ai-panel-text', 'Hide AI Panel')
  },
}

const Events = {
  init() {
    EventHandler.setupEvents([
      { id: 'file-tree', fn: (e) => EventFunctions.fileTreeItemClick(e) },
      { id: 'handle-sidebar', fn: (e) => EventFunctions.resize(e) },
      { id: 'open-workspace', fn: () => EventFunctions.openWorkspace() },
      { id: 'btn-settings', fn: () => EventFunctions.openSettings() },
      { id: 'abort-index-btn', fn: () => EventFunctions.stopIndexing() },
      { id: 'hide-sidebar', fn: () => Ui.showSidebar(false) },
      { id: 'show-sidebar', fn: () => Ui.showSidebar(true) },
      { id: 'show-ai-panel-btn', fn: () => EventFunctions.showChatPanel() },
    ]);

    EventHandler.setupResizeEvent(
      'handle-sidebar',
      (e) => EventFunctions.resize(e),
      Controller.abortController.signal,
    );

    EventHandler.setupShowAiPanelShortcut(
      (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A')
          EventFunctions.showChatPanel(e)
      },
      Controller.abortController.signal,
    );

    window.electronAPI.onIndexingProgress((filePath) => {
      if (filePath)
        DomQuery.getElement('indexing-text').textContent = `${filePath}`;
    });
  },
}

const SideBar = {
  init(config) {
    Ui.showSidebar(config.showSidebar);
    Controller.init();
    Events.init();
    this.populate(config, null);
  },

  async populate(config, path) {
    const projectPath = path || config.workspacePath;
    const projectContents = await FileHandler.loadFileTree(projectPath);
    FileTree.populate(projectContents);
  },
}

export { SideBar }
