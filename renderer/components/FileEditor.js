import { FloatingWindow } from './FloatingWindow.js';
import { FloatingButtons } from './FloatingButtons.js';

const Utility = {
  renderDiffPreview(diffBlocks, fileContents) {
    return diffBlocks.map((block, i) => {
      const searchLines = block.search.split('\n');
      const replaceLines = block.replace.split('\n');

      const deleted = searchLines
        .map(l => `<div class="diff-line deleted">- ${l}</div>`)
        .join('');

      const inserted = replaceLines
        .map(l => `<div class="diff-line inserted">+ ${l}</div>`)
        .join('');

      return `
        <div class="diff-block" data-diff-index="${i}">
          ${deleted}
          ${inserted}
          <div class="diff-actions">
            <button class="accept-diff" data-index="${i}">Accept</button>
            <button class="reject-diff" data-index="${i}">Reject</button>
          </div>
        </div>`;
    }).join('');
  },

  parseDiffBlocks(text) {
    const regex = /<SEARCH>([\s\S]*?)<\/SEARCH>\s*<REPLACE>([\s\S]*?)<\/REPLACE>/g;
    const blocks = [];
    let match = null;

    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        explanation: match[1].trim(),
        search: match[2].trim(),
        replace: match[3].trim(),
      });
    }
    return blocks;
  },

  buildDiffSummary(diffBlocks) {
    const items = diffBlocks.map((block, i) => `
    <li>
      <strong>Change ${i + 1}:</strong>
      ${block.explanation || '<em>(No explanation provided.)</em>'}
    </li>`).join('');

    return `
      <div class="ai-response">
        <p>The assistant proposed <strong>${diffBlocks.length}</strong>
        change${diffBlocks.length === 1 ? '' : 's'}. Review each one in
        the editor and use the inline <em>Accept</em> / <em>Reject</em>
        buttons to apply or discard them:</p><br>
        <ul>${items}</ul>
      </div>`;
  },

  getElement(element) {
    if (element.includes('.') || element.includes('#'))
      return document.querySelector(element)

    return document.getElementById(element);
  },
}

class FileEditor {
  constructor(id, floatingWindowManager, floatingButtonsManager) {
    this.fileEditorParent = document.getElementById('tabs-and-editor');

    this.floatingWindow = null;
    this.floatingButtons = null;

    this.floatingWindowManager = floatingWindowManager;
    this.floatingButtonsManager = floatingButtonsManager;

    this.id = id;
    this.currentFileEditor = null;
    this._activeDiffs = null;

    this._createNewFileEditor();
  }

  _createNewFileEditor() {
    const newFloatingButtons = new FloatingButtons(this.id);
    const newFloatingWindow = new FloatingWindow(this.id);

    this.floatingButtonsManager.add(this.id, newFloatingButtons);
    this.floatingWindowManager.add(this.id, newFloatingWindow);

    this.floatingButtons = newFloatingButtons;
    this.floatingWindow = newFloatingWindow;

    const newEditor = document.createElement('div');
    newEditor.className = 'editor-container';
    newEditor.id = `editor-container-${this.id}`;

    this.currentFileEditor = newEditor;
    this.fileEditorParent.appendChild(this.currentFileEditor);
    this.fileEditorParent.appendChild(this.floatingButtons.element());
    this.fileEditorParent.appendChild(this.floatingWindow.element());
  }

  hide() {
    this.currentFileEditor.style.display = 'none';
    this.currentFileEditor.classList.remove('active');

    this.floatingButtonsManager.hideAll();
    this.floatingWindowManager.hideAll();
  }

  show() {
    this.currentFileEditor.style.display = 'block';
    this.currentFileEditor.classList.add('active');

    if (this.floatingWindow.contentLength() > 0)
      this.floatingWindow.show();
  }

  switchToEditor(id) {
    const targetEditor = Utility.getElement(`editor-container-${id}`);
    targetEditor.style.display = 'block';

    this.hide();
    this.currentFileEditor = targetEditor;

    this.hideEditor(targetEditor);
  }

  remove(id) {
    const editor = Utility.getElement(`editor-container-${id}`);
    editor.remove();

    /*
    this.floatingWindowManager.get(id).remove(id);
    this.floatingButtonsManager.get(id).remove(id);
    */
  }

  hideAll() {
    document.querySelectorAll('.editor-container')
      .forEach(editor => {
        editor.classList.remove('active');
        editor.style.display = 'none';
      });

    this.floatingButtonsManager.hideAll();
    this.floatingWindowManager.hideAll();
  }

  renderDiffsInEditor(editorContainer, diffBlocks) {
    const editor = monaco.editor.getEditors().find(
      e => e.getDomNode()?.parentElement?.id === editorContainer.id
    );

    const model = editor.getModel();
    const fullText = model.getValue();
    const language = model.getLanguageId();

    this._activeDiffs = this._activeDiffs || new Map();

    diffBlocks.forEach((block, i) => {
        const startOffset = fullText.indexOf(block.search);
        if (startOffset === -1) {
          console.warn(`Search text not found for diff block ${i}`);
          return;
        }

        const startPos = model.getPositionAt(startOffset);
        const endPos   = model.getPositionAt(startOffset + block.search.length);

        const decorationId = editor.deltaDecorations([], [{
          range: new monaco.Range(
            startPos.lineNumber, 1,
            endPos.lineNumber, model.getLineMaxColumn(endPos.lineNumber)
          ),
          options: {
            isWholeLine: true,
            inlineClassName: 'diff-line-deleted',
            linesDecorationsClassName: 'diff-glyph-deleted',
            stickiness: monaco.editor.TrackedRangeStickiness
              .NeverGrowsWhenTypingAtEdges
          }
        }]);

        const replaceLines = block.replace.split('\n');
        const zoneNode = document.createElement('div');

        zoneNode.className = 'diff-viewzone';
        replaceLines.forEach(line => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'diff-line-inserted';
            lineDiv.textContent = '+ ' + line;
            zoneNode.appendChild(lineDiv);
        });

        let viewZoneId;
        editor.changeViewZones(acc => {
          viewZoneId = acc.addZone({
            afterLineNumber: endPos.lineNumber,
            heightInLines: replaceLines.length + 1,
            domNode: zoneNode,
            suppressionConfig: {}
          });
        });

        const widgetId = `diff-widget-${editorContainer.id}-${i}`;
        const wdgNode = document.createElement('div');

        wdgNode.className = 'diff-actions-inline';
        wdgNode.innerHTML = `
            <button class="accept-diff">✓ Accept</button>
            <button class="reject-diff">✗ Reject</button>
        `;

        const widget = {
          getId: () => widgetId,
          getDomNode: () => wdgNode,
          getPosition: () => ({
            position: { lineNumber: endPos.lineNumber + 1, column: 1 },
            preference: [monaco.editor.ContentWidgetPositionPreference.BELOW]
          })
        };
        editor.addContentWidget(widget);

        const acceptBtn = wdgNode.querySelector('.accept-diff');
        const rejectBtn = wdgNode.querySelector('.reject-diff');

        const clear = () => {
          editor.deltaDecorations(decorationId, []);
          editor.changeViewZones(acc => acc.removeZone(viewZoneId));
          editor.removeContentWidget(widget);
        };

        acceptBtn.addEventListener('click', () => {
          model.applyEdits([{
            range: new monaco.Range(
              startPos.lineNumber, 1,
              endPos.lineNumber, model.getLineMaxColumn(endPos.lineNumber)
            ),
            text: block.replace
          }]);
          clear();
        });

        rejectBtn.addEventListener('click', clear);
    });
  }

  element() {
    return this.currentFileEditor;
  }
}

export { FileEditor }

