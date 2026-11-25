const DiffsUI = {
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
}

export { DiffsUI };
