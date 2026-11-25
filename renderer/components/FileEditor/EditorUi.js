import { FloatingWindow } from '../FloatingWindow.js';
import { FloatingButtons } from '../FloatingButtons.js';

const EditorUI = {
  create(id) {
    const floatingWindow = FloatingWindow.create(id);
    const floatingButtons = FloatingButtons.create(id);

    return `
      <div id='editor-container-${id}' class='editor-container'>
        ${floatingButtons}
        ${floatingWindow}
      </div>
    `;
  },
}

export { EditorUI }
