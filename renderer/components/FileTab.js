import { FileEditor } from './FileEditor.js';
import { FloatingWindowManager } from './FloatingWindow.js';
import { FloatingButtonsManager } from './FloatingButtons.js';

const Utility = {
  normalizeFileName(path) {
    if (path) {
      const normalized = path.replaceAll('\\', '/').trim();
      return normalized.substring(normalized.lastIndexOf('/') + 1);
    }
    else
      return path;

    return 'Untitled';
  },

  getElement(element) {
    return document.getElementById(element);
  },
}

class FileTabManager {
  constructor() {
    this.files = new Map()
  }

  get(id) {
    return this.files.get(id);
  }

  add(id, fileTab, fileName, editor, monacoInstance, monacoHighlighter) {
    this.files.set(id, {
      fileName: fileName,
      fileTab: fileTab,
      editor: editor,
      monacoID: monacoInstance,
      monacoHighlighter: monacoHighlighter
    });
  }

  replace(id, data) {
    this.files.set(id, {
      fileName: data.fileName,
      fileTab: data.fileTab,
      editor: data.editor,
      monacoID: data.monacoID,
      monacoHighlighter: data.monacoHighlighter
    });
  }

  remove(id) {
    let tab = this.files.get(id);
    tab.monacoID.dispose();
    tab.monacoHighlighter.destroy();
    tab.fileTab.remove();
    //tab.fileTab.element().remove();

    this.files.delete(id);
    tab = null;
  }

  hideAll() {
    for (let [, fileTab] of this.files) {
      fileTab.fileTab.hide();
    }
  }

  getAll() {
    return this.files;
  }
}

class FileTab {
  constructor(
    id,
    fileName,
    floatingWindowManager,
    floatingButtonsManager,
    fileTabManager,
  ) {
    this.id = id;
    this.floatingWindowManager = floatingWindowManager;
    this.floatingButtonsManager = floatingButtonsManager;
    this.fileTabManager = fileTabManager;

    this.fileTab = null;
    this.editor = null;

    this._createNewFileTab(fileName);
  }

  _createNewFileTab(fileName) {
    const tab = document.createElement('div');
    tab.className = 'tabRA';
    tab.id = `file-tab-${this.id}`;
    tab.classList.add('active');

    const title = document.createElement('p');
    title.textContent = Utility.normalizeFileName(fileName);
    title.id = `file-tab-title-${this.id}`;

    const closeTabButton = document.createElement('button');
    closeTabButton.className = 'tab-close';
    closeTabButton.title = 'Close file';
    closeTabButton.id = `btn-close-file-${this.id}`;
    closeTabButton.textContent = '×';

    tab.appendChild(title);
    tab.appendChild(closeTabButton);

    const newEditor = new FileEditor(
      this.id,
      this.floatingWindowManager,
      this.floatingButtonsManager
    );

    this.editor = newEditor;
    this.fileTab = tab;
  }

  hideAllFileTabs() {
    this.fileTabManager.hideAll();
    this.editor.hideAll();
  }

  switchToEditor(id) {
    this.hide();

    const targetEditor = this.fileTabManager.get(id).editor;
    targetEditor.show();

    this.editor = targetEditor;
  }

  remove() {
    //this.editor.remove(this.id);
    this.fileTab.remove();
    //this.fileTabManager.remove(this.id);
    console.log(this.fileTabManager.files);
  }

  show() {
    this.fileTab.classList.add('active');
    this.editor.show();
  }

  hide() {
    this.fileTab.classList.remove('active');
    this.editor.hide();
  }

  element() {
    return this.fileTab;
  }

  editorElement() {
    return this.editor;
  }
}

export { FileTabManager, FileTab }

