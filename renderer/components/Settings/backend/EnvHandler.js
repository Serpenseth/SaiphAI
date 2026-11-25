const EnvHandler = {
  async isOpenAiEnvKeyEmpty() {
    return window.electronAPI.isKeyEmpty('OPENAI_KEY');
  },

  async writeToEnv(envKey, key) {
    window.electronAPI.writeEnvKey(envKey, key);
  },
}

export { EnvHandler };
