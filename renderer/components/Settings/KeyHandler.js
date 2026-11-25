import { AiBackend } from './WindowAPI.js';

const HashUtil = {
  async createHash(input) {
    return window.electronAPI.createHash(input);
  },
}

const KeyCacheHandler = {
  checkedKeys: [],
  prevErrorMsg: null,

  shouldSkipVerification(hashedKey) {
    if (!this.prevErrorMsg)
      return false;

    const hadNetworkError = this.prevErrorMsg.includes("fetch");

    if (this.checkedKeys.includes(hashedKey)) {
      return !hadNetworkError;
    }

    return false;
  },

  recordFailure(hashedKey, errorMsg) {
    this.prevErrorMsg = errorMsg;
    this.checkedKeys.push(hashedKey);
  },

  clearCache() {
    this.checkedKeys = [];
    this.prevErrorMsg = null;
  }
}

const KeyHandler = {
  async verifyKey(key) {
    const hashedKey = await HashUtil.createHash(key);

    if (KeyCacheHandler.shouldSkipVerification(hashedKey)) {
      return { success: false, errorMsg: KeyCacheHandler.prevErrorMsg };
    }

    try {
      const result = await AiBackend.isKeyValid(key);

      if (!result.valid) {
        KeyCacheHandler.recordFailure(hashedKey, result.message);
        return { success: false, errorMsg: result.message };
      }

      KeyCacheHandler.clearCache();
      return { success: true, errorMsg: null };
    }
    catch (err) {
      throw err;
    }
  }
}

export { KeyHandler }
