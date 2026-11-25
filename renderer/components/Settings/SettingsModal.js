const SettingsModal = {
  ui() {
    return `
      <div id='settings-content' class='modal-content-settings'>
        <br>
        <div style='display: flex; flex-direction: row; width: 100%; pointer-events: auto;'>
          <h1 style='margin-left: 3rem;'>Settings</h1>
          <buttton id='close-settings-modal' class='close-modal'>
            X
          </button>
        </div>
        <br><br>

        <div id='ollama-login' class='settings-conts'>
          <div style='display: flex; flex-direction: row; width: 17%'>
            <h3 class='settings-option-title'>Ollama</h3>
            <p id='ollama-selected-badge' class='settings-selected-badge' style='display: none;'>Selected</p>
          </div>
          ${this._createOllamaLogin()}
          <br>
          ${this._createOllamaModelDownload()}
        </div>

        <p style='margin-top: 0.15rem;'></p>

        <div id='openai-login' class='settings-conts'>
          <div style='display: flex; flex-direction: row; width: 17%'>
            <h3 class='settings-option-title'>OpenAI</h3>
            <p id='openai-selected-badge' class='settings-selected-badge' style='display: none;'>Selected</p>
          </div>
          ${this._createOpenAiLogin()}
        </div>
      </div>
    `;
  },

  _createOllamaLogin() {
    return  `
      <ul class='settings-options'>
        <div id='ollama-login' class='settings-api-key-container'>
          <p id='ollama-login-text' class="settings-option-second-text"></p><br>
          <button id="ollama-settings-login" class="btn btn-secondary settings-button"' style='display: none'>Login</button>
          <button id="select-ollama-settings" class="btn btn-secondary settings-button">Switch to OpenAI</button>
        </div>
      </ul>
    `;
  },

  _createOllamaModelDownload() {
    return `
      <div id='download-model-settings' style='border-top: 1px solid rgba(73, 92, 184, 0.075); flex-direction: column'>
        <p style='margin-top: 1rem; margin-left: 0'>Download Ollama model</p>
        <div style='display: flex; flex-direction: row; width: 100%; margin-top: 0.5rem'>
          <p class='settings-option-second-text' style='margin-top: 0.25rem; margin-left: 0;' >Ollama model to download:</p>
          <input id="settings-model-to-pull" class="settings-input settings-dl-model" placeholder='e.g mistral-medium-3.5:latest'></input>
          <button id='dl-ollama-model-settings' class='btn btn-secondary settings-download-model'>
            <img width='24' height='24' src="../assets/download-button.png">
          </button>
          <button id='abort-ollama-model-dl-settings' class='btn btn-secondary' style='display: none; margin-left: 2.5rem; padding: 0.25rem'>Abort download</button>
        </div>

        <div id='download-model-div' style='display: flex; flex-direction: row; width: 100%;'>
          <p id='model-dl-settings-err' class='settings-error-msg-bubble' style='display: none'></p>
          <p id="dl-text-settings" style="margin-top: 0.75rem; display: none"><strong>Downloading...</strong></p>
          <p id="ollama-settings-dl-progress-text"  style="margin-top: 0.75rem; margin-left: 1rem; style='display: none"></p>
        </div>
      </div>
    `;
  },

  _createOpenAiLogin() {
    return `
      <ul class='settings-options'>
        <p id='enter-openai-key-text' class="settings-option-second-text">Enter your OpenAI API key to use OpenAI models</p>
        <div class='settings-api-key-container' style='margin-top: 4rem'>
          <p id='api-key-text' style='margin-right: 12px; margin-top: 3px;'> API key:</p>
          <input id="openai-acc-settings" class="settings-input" placeholder="sk-proj-..."></input>
          <button id="verify-openai-key-settings" class="btn btn-secondary settings-button" style='margin-right: 1.15rem'>Verify</button>
          <div id='spinner-settings' class='settings-spinner' style='display: none;'></div>
          <p id='openai-login-text' class="settings-option-second-text"></p><br>
          <button id="select-openai-settings" class="btn btn-secondary settings-button">Switch to Ollama</button>
        </div>
        <p id='open-ai-settings-err' class='settings-error-msg-bubble'></p>
      </ul>
    `;
  },
}

export { SettingsModal };
