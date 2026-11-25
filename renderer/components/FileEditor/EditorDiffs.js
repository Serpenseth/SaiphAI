const EditorDiffs = {
  activeDiffs: null,

  create(editorContainer, diffBlocks) {
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
      }, { once: true });

      rejectBtn.addEventListener('click', clear, { once: true });
    });
  },
}

export { EditorDiffs };
