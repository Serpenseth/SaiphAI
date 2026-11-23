import { DomQuery } from '../../utility/utilities.js';

const ModelSelector = {
  async populate(config, id) {
    const selector = DomQuery.getElement(`select-model-ai-panel-${id}`);
    const framework = config.modelFramework;
    const selectedModel = config.selectedModel;
    const models = framework === 'ollama'
      ? config.ollamaModels
      : config.openaiModels;

    const options = models
      .map(m => {
        const s = document.createElement('option');
        s.value = m;
        s.textContent = m;
        s.style.background = '#18181C';

        return s;
      });

    selector.replaceChildren(...options);
    selector.value = selectedModel;
  },
}

export { ModelSelector };
