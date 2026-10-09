export const StringUtils = {
  getRawID(id) {
    const element = id.substring(id.lastIndexOf('-') + 1);
    return !element ? id.substring(id?.id.lastIndexOf('-') + 1) : element;
  },
}

export const MarkdownParser = {
  parse(text) {
    if (!text)
      return '';

    // Extract code blocks first to protect them from newline replacement
    const codeBlocks = [];
    let processedText = text
      .replace(/&/g, '&amp;')
      .replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        // Get language
        const language = lang || 'text';
        // Apply highlighting
        const highlighted = hljs.highlight(code.trim(), { language: language }).value;

        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`
        <div>
          <pre>
            <code class="hljs language-${language}">${highlighted}</code>
          </pre>
        </div>`);

        return placeholder;
      })
      .replace(/^(?:\/\/.*)$/gm, '<span class="comment">$1</span>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/((?:^\d+\.\s+.+$\n?)+)/gm, (match) => {
        const items = match.trim().split('\n').map(line => {
          const content = line.replace(/^\d+\.\s+/, '');
          return `<li>${content}</li>`;
        }).join('');

        return `<ol>${items}</ol>`;
      })
      .replace(/((?:^[-*]\s+.+$\n?)+)/gm, (match) => {
        const items = match.trim().split('\n').map(line => {
          const content = line.replace(/^[-*]\s+/, '');
          return `<li>${content}</li>`;
        }).join('');

        return `<ul>${items}</ul>`;
      })
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    codeBlocks.forEach((block, index) => {
      processedText = processedText.replace(`__CODE_BLOCK_${index}__`, block);
    });

    return processedText;
  },
}

export const UuidGenerator = {
  generate(length=8) {
    return crypto.randomUUID().substring(0, length);
  },
}

export const DomQuery = {
  getElement: (id) => {
    if (id?.includes('.') || id?.includes('#'))
      return document.querySelector(id)

    return document.getElementById(id);
  },

  removeElement(id) {
    const el = this.getElement(id);
    if (el)
      el.remove();
  },

  insertHTML(containerId, html) {
    if (containerId === document.body)
      containerId.insertAdjacentHTML('beforebegin', html);

    else {
      const container = this.getElement(containerId);

      if (container)
        container.insertAdjacentHTML('beforeend', html);
    }
  },

  updateText(id, text) {
    const el = this.getElement(id);
    if (el)
      el.textContent = text;
  },

  updateInnerHTML(id, content) {
    const el = this.getElement(id);
    if (el)
      el.innerHTML = content;
  },

  updateInputValue(id, value) {
    const el = this.getElement(id);
    if (el)
      el.value = value;
  },

  toggleVisibility(id, isVisible) {
    const el = this.getElement(id);

    el.style.contentVisibility = isVisible ? '' : 'hidden';
    el.style.opacity = isVisible ? 1 : 0;
    el.style.visibility = isVisible ? 'visible' : 'hidden';
  },

  setElementClass(id, className, add = true) {
    const el = this.getElement(id);

    if (el)
      el.classList[add ? 'add' : 'remove'](className);
  },

  showElement(id, isVisible) {
    const el = this.getElement(id);
    el.style.display = isVisible ? '' : 'none';
  },

  setBorder(id, style) {
    const el = this.getElement(id);
    el.style.border = style;
  },

  setWidth(id, newWidth) {
    const el = this.getElement(id);
    el.style.width = newWidth;
  }
};

