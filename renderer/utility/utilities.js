export const StringUtils = {
  getRawID(id) {
    const element = id.substring(id.lastIndexOf('-') + 1);
    return !element ? id.substring(id?.id.lastIndexOf('-') + 1) : element;
  },
}

export const DomQuery = {
  getElement: (id) => document.getElementById(id),

  removeElement(id) {
    const el = this.getElement(id);
    if (el)
      el.remove();
  },

  insertHTML(containerId, html) {
    const container = this.getElement(containerId);

    if (container)
      container.insertAdjacentHTML('beforeend', html);
  },

  updateText(id, text) {
    const el = this.getElement(id);
    if (el)
      el.textContent = text;
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

  toggleButton(id, isVisible) {
    const el = this.getElement(id);
    el.style.display = isVisible ? '' : 'none';
  },
};

