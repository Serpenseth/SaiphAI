const OllamaHandler = {
  async isLoggedInToOllama() {
    return await window.electronAPI.isLoggedInToOllama();
  },

  async login() {
    const { stdout, stderr } = await window.electronAPI.launchProcess('ollama', ['login']);

    if (String(stderr).includes('ENOENT')) {
      return { loginMessage: null, loginError: 'Ollama is not installed' }
    }

    if (stderr) {
      return { loginMessage: null, loginError: String(stderr) }
    }

    return { loginMessage: stdout, loginError: null }
  },

  async isOllamaInstalled() {
    const { stderr } = await window.electronAPI.launchProcess('ollama', ['help']);
    return stderr ? false : true;
  },
}

export { OllamaHandler };
