import { DomQuery, MarkdownParser } from '../utility/utilities.js';

const Backend = {
  async downloadUpdate(data) {
    await window.electronAPI.downloadUpdate(data);
  },

  async installUpdate() {
    await window.electronAPI.installUpdate();
  },
}

const UpdateModalUi = {
  create(data) {
    const currentVersion = data.localVersion;
    const remoteVersion = data.remoteVersion;
    const releaseNotes = data.githubData.releaseNotes;

    return `
      <div id='update-details' class='modal-content-settings' style='pointer-events: auto; height: 80%;'>
        <h1 style='margin-top: 4rem;'>Update Available!</h1><br>

        <div class="update-info">
          <div style='display: flex; flex-direction: column; align-items: center;'>
            <p id="update-version" class='secondary-text'>Current Version: ${currentVersion}</p>
            <p id="update-remote-version" class="update-version"><strong>New Version: ${remoteVersion}</strong></p>
          </div>
          <br>
          <div id="update-release-notes" class='update-release-notes'>
            <div id="update-release-notes">${MarkdownParser.parse(releaseNotes)}</div>
          </div>
        </div> <br>
        <div class="modal-actions">
          <button id="update-later" class="btn btn-secondary" style='width: 128px;'>Later</button>
          <button id="btn-download-update" class="btn btn-primary" style='width: 128px;'>Download Update</button>
        </div>
      </div>
    </div>

    ${this._createDownloadingUpdate()}
    ${this._createUpdateReady()}
    `;
  },

  _createDownloadingUpdate() {
    return `
      <div id="update-downloading-modal" class='modal-content-settings' style='display: none; pointer-events: auto; height: 40%; width: 50%;'>
        <div class="modal-header">
          <h1 style='margin-top: 4rem;'>Downloading Update</h1><br>
          </div>
          <div class="update-progress">
            <div class="progress-bar">
              <div style='background: rgba(64, 112, 161, 0.075); border-radius: 4px;'>
                <div id='update-progress-fill' class="progress-fill"></div>
              </div><br>
              <p id='update-progress-text' class="progress-text">0%</p>
          </div>
        </div>
      </div>
    `;
  },

  _createUpdateReady() {
    return `
      <div id="update-install-modal" class='modal-content-settings' style='display: none; pointer-events: auto; height: 40%; width: 50%;'>
        <div class="modal-header">
          <h1 style='margin-top: 4rem;'>Update Ready</h1><br>
        </div>
        <div class="update-info">
          <div style='display: flex; flex-direction: column; align-items: center;'>
            <p id="update-ready-version">The update is ready to install</p>
            <p class="update-notice">SaiphAI will restart to complete the installation.</p><br>
          </div>
          <div class="modal-actions" style='margin-right: 4rem;'>
            <button id='install-later' class="btn btn-secondary" style='width: 128px;'>Later</button>
            <button id='install-now' class="btn btn-primary" style='width: 128px;'>Install</button>
          </div>
        </div>
      </div>
    `;
  },
}

const Ui = {
  show() {
    DomQuery.toggleVisibility('update-available-modal', true);
  },

  showProgressContatiner() {
    DomQuery.showElement('progress-container', true);
  },

  showDownloadingUpdate() {
    DomQuery.showElement('update-downloading-modal', true);
  },

  showInstallUpdate() {
    DomQuery.showElement('update-install-modal', true);
  },

  build(htmlTemplate) {
    DomQuery.insertHTML('update-available-modal', htmlTemplate);
  },

  buildNextUpdateStep(htmlTemplate) {
    DomQuery.removeElement('update-details');
    DomQuery.insertHTML('update-available-modal', htmlTemplate);
  },

  remove() {
    DomQuery.removeElement('update-available-modal');
  },

  removeUpdateDetails() {
    DomQuery.removeElement('update-details');
  },

  removeDownloadingUpdate() {
    DomQuery.removeElement('update-downloading-modal');
  },
}

const Controller = {
  abortController: null,

  init() {
    this.abortController = new AbortController();
  },
}

const EventHandler = {
  setupEvents(elems, fn, abortSignal) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);

      if (elem)
        elem.addEventListener('click', fn, { signal: abortSignal });
    });
  },

  destroy(abortSignal) {
    abortSignal.abort();
  },
}

const ProgressHandler = {
  registerDownloadProgressEvent(progressFill, progressText) {
    window.electronAPI.onUpdateDownloadProgress((data) => {
      progressFill.style.width = `${data.percent}%`;
      progressText.textContent = `${data.percent}%`;

      if (data.percent === 100) {
        Ui.removeDownloadingUpdate();
        Ui.showInstallUpdate();
      }
    });
  },
}

const DownloadUpdateButton = {
  async handleClick(data) {
    Ui.removeDownloadingUpdate();
        Ui.showInstallUpdate();
        return;

    Ui.removeUpdateDetails();
    Ui.showDownloadingUpdate();

    const progressFill = DomQuery.getElement('update-progress-fill');
    const progressText = DomQuery.getElement('update-progress-text');

    ProgressHandler.registerDownloadProgressEvent(progressFill, progressText);
    await Backend.downloadUpdate(data);
  }
}

let UpdateModal = {
  updateEventHandlerObject: null,

  registerEventListeners(data) {
    EventHandler.setupEvents([
      { id: 'update-later', fn: () => UpdateModal.destroy() },
      { id: 'btn-download-update', fn: () => DownloadUpdateButton.handleClick(data) },
      { id: 'install-later', fn: () => UpdateModal.destroy() },
      { id: 'install-now', fn: () => Backend.installUpdate() },
    ], Controller.abortController.signal);
  },

  async init(updateEventHandler, data) {
    Ui.build(UpdateModalUi.create(data));
    Controller.init();

    this.registerEventListeners(data);
    this.updateEventHandlerObject = updateEventHandler;
  },

  show() {
    Ui.show();
  },

  remove() {
    Ui.remove();
  },

  async destroy() {
    await window.electronAPI.removeUpdateListeners();
    this.updateEventHandlerObject.destroy();
    this.updateEventHandlerObject = null;

    Ui.remove();
    EventHandler.destroy(Controller.abortController);
    UpdateModal = null;
  }
}

export { UpdateModal };
