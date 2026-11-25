import {
  DomQuery,
  StringUtils,
  MarkdownParser,
} from '../utility/utilities.js';

import { EditorUI } from './FileEditor/EditorUi.js';
import { DiffsUI } from './FileEditor/DiffsUI.js';
import { EditorDiffs } from './FileEditor/EditorDiffs.js';
import { DiffsBlock } from './FileEditor/DiffsBlock.js';
import { MonacoInstance } from './FileEditor/MonacoInstance.js';
import { EditorManager } from './FileEditor/EditorManager.js';
import { Ui } from './FileEditor/Ui.js';
import { FileEditorBuilder } from './FileEditor/FileEditorBuilder.js';

import { MonacoHighlighter } from './MonacoHighlighter.js';
import { FloatingWindow } from './FloatingWindow.js';
import { FloatingButtons } from './FloatingButtons.js';

const ActiveEditor = {
  active: null,

  set(editor) {
    this.active = editor;
  },

  get() {
    return active;
  },
}

const FileEditor = {
  create(rawFileTabID, file) {
    const id = rawFileTabID
    const editorEl = FileEditorBuilder.init(id);
    const floatingBtns = FloatingButtons.element(id);

    ActiveEditor.set(editorEl);
    MonacoInstance.init(editorEl, file).then(monacoInstance => {
      const highlighter = new MonacoHighlighter(monacoInstance, floatingBtns);

      EditorManager.set(id, {
        fileEditorElement: editorEl,
        monacoInstance: monacoInstance,
        monacoHighlighter: highlighter,
      });
    });

    return editorEl;
  },

  show(fullEditorContainerID, state) {
    Ui.showEditor(fullEditorContainerID, state);
  },

  destroy(rawFileTabID) {
    EditorManager.remove(rawFileTabID);
    Ui.removeEditor(`editor-container-${rawFileTabID}`);
    FloatingWindow.destroy(rawFileTabID);
    FloatingButtons.destroy(rawFileTabID);
  },

  element(rawFileTabID) {
    return Ui.getEditorElement(`editor-container-${rawFileTabID}`);
  },

  async explainText(btnD, text, fileName) {
    return await FloatingWindow.explainText(btnD, text, fileName);
  },

  getActiveEditor() {
    return ActiveEditor.get();
  },

  getEditorElement(fullEditorID) {
    return Ui.getEditorElement(fullEditorID);
  },

  setActiveEditor(fullEditorContainerID) {
    const editorEl = Ui.getEditorElement(fullEditorContainerID);
    return ActiveEditor.set(editorEl);
  },

  buildDiffSummary(diffBlocks) {
    return DiffsUI.buildDiffSummary(diffBlocks);
  },

  renderDiffPreview(diffBlocks, fileContents) {
    return DiffsUI.renderDiffPreview(diffBlocks, fileContents);
  },

  createEditorDiffs(editorContainer, diffBlocks) {
    EditorDiffs.create(editorContainer, diffBlocks);
  },

  parseDiffBlocks(blocks) {
    return DiffsBlock.parse(blocks);
  },
}


export { FileEditor }

