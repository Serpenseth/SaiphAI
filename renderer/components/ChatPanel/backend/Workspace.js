const Workspace = {
  async search(query) {
    return window.electronAPI.searchWorkspace(query);
  },
}

export { Workspace };
