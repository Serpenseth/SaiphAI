import { Config } from './WindowAPI.js';

const ModelSelectorHandler = {
  async handleChange(e) {
    const selected = e.target.value;
    await Config.saveSelectedModel(selected);
    //ChatPanelData.config.selectedModel = selected;
  },
}

export { ModelSelectorHandler }
