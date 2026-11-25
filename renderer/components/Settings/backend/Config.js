const Config = {
  async get() {
    return await window.electronAPI.readConfigFile();
  },

  async writeToConfig(data) {
    await window.electronAPI.writeToConfigFile(data);
  },
}

export { Config };
