import { MonacoHighlighter } from './MonacoHighlighter.js';
import { FileTabManager } from './FileTab.js';

import {
  AttachSelectedFiles,
  AttachSelectedFilesClickHandler,
} from './AttachSelectedFiles.js';

import { IndexWorkspaceModal } from './IndexWorkspaceModal.js';

const Backend = {
  async loadFileTree(path) {
    return await window.electronAPI.scanFolder(path);
  },

  async getWorkspace() {
    return await window.electronAPI.openFolder();
  },

  async saveWorkspace(workspace)  {
    await window.electronAPI.writeToConfigFile({ workspacePath: workspace });
  },

  async getWorkspaceFromConfig() {
    const config = await window.electronAPI.readConfigFile();
    return config.workspacePath;
  },

  async indexWorkspace(workspacePath) {
    return await window.electronAPI.indexWorkspace(workspacePath);
  },

  async readFile(filePath) {
    return await window.electronAPI.readFile(filePath);
  },

  async initMonaco(tab, file) {
    const contents = await Backend.readFile(file);
    const extRaw = file.substr(file.lastIndexOf('.')+1, file.length-1);

    let ext = null;

    switch (extRaw) {
      case 'js':
        ext = 'javascript';
        break;

      case 'md':
        ext = 'markdown';
        break;

      case 'py':
        ext = 'python';
        break;

      case 'ts':
        ext = 'typescript';
        break;

      case 'exs':
        ext = 'elixir';
        break;

      case 'sh':
        ext = 'bash';
        break;

      case 'ps1':
        ext = 'powershell';
        break;

      case 'rs':
        ext = 'rust';
        break;

      default: ext = extRaw;
    }

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
  }
}

const Utility = {
  removeExtension(path) {
    return path.substring(path.lastIndexOf('/') + 1);
  },

  getRawID(id) {
    const element = id.substring(id.lastIndexOf('-') + 1);
    return !element ? id.substring(id.id.lastIndexOf('-') + 1) : element;
  },
}

const DomQuery = {
  getElement(element) {
    if (element.includes('.') || element.includes('#'))
      return document.querySelector(element)

    return document.getElementById(element);
  },
}

const PathUtils = {
  getFileName(path) {
    if (path) {
      const normalized = path.replaceAll('\\', '/').trim();
      return normalized.substring(normalized.lastIndexOf('/') + 1);
    }
    else
      return path;

    return 'Untitled';
  },
}

class ResizeManager {
  constructor(ui) {
    this.startMouseX = 0;
    this.startWidth = 0;

    this.ui = ui;
    this.boundResize = this.resize.bind(this);
    this.boundStopResize = this.stopResize.bind(this);
  }

  startResize(e) {
    this.startMouseX = e.clientX;
    this.startWidth = this.ui.sidebar.offsetWidth;
  }

  resize(e) {
    const box = this.ui.sidebar;
    const minWidth = 180;
    const maxWidth = window.innerWidth * 0.2;

    // Calculate how much the mouse has moved since the click
    const deltaX = e.clientX - this.startMouseX;
    let newWidth = this.startWidth + deltaX;

    // Clamp the value
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

    box.style.width = newWidth + 'px';
    this.ui.savedWidth = box.style.width;
  }

  stopResize() {
    window.removeEventListener('mousemove', this.boundResize);
    window.removeEventListener('mouseup', this.boundStopResize);
  }
}

class SideBarUI {
  constructor() {
    this.sidebarContainer = document.getElementById('sidebar-container');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarBtnContainer = document.getElementById('sidebar-actions');
    this.hideSidebar = document.getElementById('hide-sidebar');
    this.showSidebar = document.getElementById('show-sidebar');
    this.buildButton = document.getElementById('build-toggle-btn');
    this.settingsButton = document.getElementById('btn-settings');
    this.openWorkspaceButton = document.getElementById('open-workspace');
    this.emptySidebarMsg = document.getElementById("sidebar-empty");
    this.fileTree = document.getElementById('file-tree');
    this.resizeHandle = document.getElementById("handle-sidebar");
    this.settingsText = document.getElementById('settings-text');

    this.savedWidth = this.sidebar.style.width;
    this.isHidden = false;
  }

  show() {
    this.sidebar.style.width = this.savedWidth;
    this.sidebarContainer.style.width = '';
    this.hideSidebar.style.display = '';
    this.showSidebar.style.display = 'none';
    this.settingsText.textContent = 'Settings';
    this.fileTree.style.contentVisibility = '';
    this.sidebarBtnContainer.style.borderBottom = '';

    this.isHidden = false;
  }

  hide() {
    this.sidebar.style.width = '40px';
    this.sidebarContainer.style.width = '40px';
    this.showSidebar.style.display = '';
    this.hideSidebar.style.display = 'none';
    this.settingsText.textContent = '';
    this.fileTree.style.contentVisibility = 'hidden';
    this.sidebarBtnContainer.style.borderBottom = 'none';

    this.isHidden = true
  }

  populate(items, container=null) {
    const target = container || this.fileTree;
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
  }

  removeEmptyMessage() {
    this.emptySidebarMsg.remove();
  }
}

class EventHandler {
    constructor(ui, coordinator, resizeManager) {
    this.ui = ui;
    this.coordinator = coordinator;
    this.controller = new AbortController();
    this.resizeManager = resizeManager;
  }

  addListener(element, event, handler) {
    element.addEventListener(event, handler, { signal: this.controller.signal });
  }

  init() {
    this.addListener(this.ui.fileTree, 'click', async (e) => {
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

        const items = await this.coordinator.service.loadFileTree(path);
        this.ui.populate(items, div);
      }

      else if (!item.classList.contains('directory')) {
        const fullPath = item.dataset.path;
        const fname = Utility.removeExtension(fullPath);
        const allTabs = this.coordinator.fileTabManager.getAll();

        for (let [id, tab] of allTabs) {
          if (tab.fileTab.element().textContent.includes(fname)) {
            this.coordinator.mainUI.ui.switchToFileTab(id);
            return
          }
        }

        item.classList.add('selected');

        const openedFilesSelection = DomQuery.getElement('selected-opened-files');
        const attachOpenedFile = DomQuery.getElement('attach-opened-file');

        if (!openedFilesSelection) {
          AttachSelectedFiles.create();

          attachOpenedFile.removeAttribute('data-tooltip');
          attachOpenedFile.style.cursor = 'pointer';
          attachOpenedFile.disabled = false;

          AttachSelectedFilesClickHandler.init();
        }

        else {
          attachOpenedFile.removeAttribute('data-tooltip');
          attachOpenedFile.style.cursor = 'pointer';
          attachOpenedFile.disabled = false;
          AttachSelectedFiles.add(item);
        }

        await this.coordinator.loadFileContents(fullPath);
      }
    });

    this.addListener(this.ui.resizeHandle, 'mousedown', (e) => {
      if (this.ui.isHidden)
        return;

      e.preventDefault();

      this.resizeManager.startResize(e);

      window.addEventListener('mousemove', this.resizeManager.boundResize);
      window.addEventListener('mouseup', this.resizeManager.boundStopResize);
    });

    this.addListener(this.ui.hideSidebar, 'click', () => this.ui.hide());
    this.addListener(this.ui.showSidebar, 'click', () => this.ui.show());

    this.addListener(this.ui.openWorkspaceButton, 'click', async () => {
      const workspace = await Backend.getWorkspace();

      if (workspace) {
        this.coordinator.projectPath = workspace;
        this.ui.removeEmptyMessage();

        await this.coordinator.populate();
        await Backend.saveWorkspace(workspace);

        this.coordinator.workspaceModal.show();
        this.coordinator.indexWorkspace(workspace)
      }
    });

    window.electronAPI.onIndexingProgress((filePath) => {
      DomQuery.getElement('indexing-text').textContent = `${filePath}`;
    });
  }
}

class SideBar {
  constructor(
    //projectPath,
    backend,
    ui,
    eventHandler,
    fileTabManager
  ) {
    this.projectPath = null; // projectPath;
    this.service = backend;
    this.ui = ui;
    this.eventHandler = eventHandler;
    this.fileTabManager = fileTabManager;
    this.mainUI = null;

    this.workspaceModal = new IndexWorkspaceModal();
  }

  show() {
    this.ui.show();
    this.eventHandler.init();

    this.service.getWorkspaceFromConfig()
      .then(res => {
        if (res) {
          this.projectPath = res;
          this.populate();

          //this.indexWorkspace(res);
        }
      });
  }

  async indexWorkspace(workspacePath) {
    return await this.service.indexWorkspace(workspacePath);
  }

  hide() {
    this.ui.hide();
  }

  async populate() {
    const projectContents = await this.service.loadFileTree(this.projectPath);
    this.ui.populate(projectContents);
  }

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
}

export function createSidebar(/*projectPath, */ fileTabManager) {
  const ui = new SideBarUI();
  const resizeManager = new ResizeManager(ui);
  const eventHandler = new EventHandler(ui, null, resizeManager);

  const sidebar = new SideBar(
    //projectPath,
    Backend,
    ui,
    eventHandler,
    fileTabManager
  );

  eventHandler.coordinator = sidebar;

  return sidebar;
}

