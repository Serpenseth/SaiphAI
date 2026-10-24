import { DomQuery } from '../utility/utilities.js';

class IndexWorkspaceModal {
  show(state) {
    const workspaceModal = 'indexing-workspace-modal';
    DomQuery.toggleVisibility(workspaceModal, state);
    DomQuery.showElement(workspaceModal, state);
  }
}

export { IndexWorkspaceModal };

  // constructor(workspacePath) {
  //   this.workspace = workspacePath;
  // }
