import { DomQuery } from '../../utility/utilities.js';

const Ui = {
  showEditor(fullEditorContainerID, state) {
    DomQuery.showElement(fullEditorContainerID, state);
  },

  convertHTMLToDOM(editorContainerHTML) {
    const elementDOM = DomQuery.htmlTemplateToDOM(editorContainerHTML);
    const firstChild = elementDOM.firstElementChild;

    return firstChild;
  },

  getEditorElement(fullEditorContainerID) {
    return DomQuery.getElement(fullEditorContainerID);
  },

  attachEditorElement(editorElement) {
    DomQuery.appendChild('tabs-and-editor', editorElement);
  },

  removeEditor(fullEditorContainerID) {
    DomQuery.removeElement(fullEditorContainerID);
  },
}

export { Ui };
