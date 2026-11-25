import { EditorUI } from './EditorUi.js';
import { Ui } from './Ui.js';
import { FloatingWindow } from '../FloatingWindow.js';
import { FloatingButtons } from '../FloatingButtons.js';

const UiBuilder = {
  build(id) {
    const editorHTML = EditorUI.create(id);
    const editorEl = Ui.convertHTMLToDOM(editorHTML);
    return editorEl;
  },
}

const FileEditorBuilder = {
  init(id) {
    const editor = UiBuilder.build(id);

    const elementsToAttach = [
      editor,
      Ui.convertHTMLToDOM(FloatingButtons.create(id)),
    ];

    elementsToAttach.forEach(el => {
      Ui.attachEditorElement(el);
    });

    return editor;
  },
}

export { FileEditorBuilder };
