const DomQuery = {
  getElement(element) {
    if (element.includes('.') || element.includes('#'))
      return document.querySelector(element)

    return document.getElementById(element);
  },
}

class IndexWorkspaceModal {
  constructor() {
    this.indexingModal = DomQuery.getElement('indexing-workspace-modal');
    this.indexingModalContent = DomQuery.getElement('index-workspace-dialog');
  }

  show() {
    this.indexingModal.style.display = 'flex';
    this.indexingModal.style.contentVisibility = '';
    this.indexingModal.style.opacity = 1;
    this.indexingModal.style.visibility = "visible";
  }

  hide() {
    this.indexingModal.style.display = 'none';
    this.indexingModal.style.contentVisibility = 'hidden';
    this.indexingModal.style.opacity = 0;
    this.indexingModal.style.visibility = "hidden";
  }
}

export { IndexWorkspaceModal };

  // constructor(workspacePath) {
  //   this.workspace = workspacePath;
  // }

