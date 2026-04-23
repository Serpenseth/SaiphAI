class App {
  constructor() {
    // User's workspace
    this.workspacePath = null;
    // Selected model (Tinyllama or Ollama)
    this.currentModel = null;
    // Files from index
    this.openFiles = new Map();
    // Current tab
    this.activeTab = 'chat';
    // File editor
    this.editor = null;
    // Configurations
    this.config = {};
    // Pipeline for downloads
    this.tinyLlamaPipeline = null;
    // Transformers
    this.transformers = null;
    // Download related
    this.isDownloading = false;
    this.downloadPaused = false;
    this.activeDownloadType = null;
    this.downloadState = {
      isResuming: false,
      currentFileIndex: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
          filesToDownload: [
        { remote: 'config.json', local: 'models/Xenova/TinyLlama-1.1B-Chat-v1.0/config.json' },
        { remote: 'tokenizer.json', local: 'models/Xenova/TinyLlama-1.1B-Chat-v1.0/tokenizer.json' },
        { remote: 'tokenizer_config.json', local: 'models/Xenova/TinyLlama-1.1B-Chat-v1.0/tokenizer_config.json' },
        { remote: 'onnx/decoder_model_merged_quantized.onnx', local: 'models/Xenova/TinyLlama-1.1B-Chat-v1.0/onnx/decoder_model_merged_quantized.onnx' }
      ]
    };
    this.downloadAbortController = null;
    // Ollama-related
    this.availableOllamaModels = [];
    this.currentOllamaModel = null;
    this.ollamaModelSelect = document.getElementById('ollama-model-selector');
    // Monitor file changes within workspace
    this.fsChangeTimeout = null;
    this.pendingChanges = new Set();
    // Uploaded files
    this.attachedFiles = [];
    // Chat history management
    this.currentChat = {
      id: null,
      title: 'New Chat',
      messages: [],
      date: new Date().toISOString()
    };
    this.chatHistory = [];
    // Welcome hub
    this.showWelcomeHub = !this.config.hideWelcomeHub;
    this.hubUpdateTimeout = null;
    // Active file
    this.activeFilePath = null;
    // Build related
    this.activeBuilds = new Map();
    this.buildHistory = [];
    this.currentBuildConfig = null;
    // Workspace index cache
    this.workspaceIndex = {
      index: new Map(),
      projectMetadata: null
    };
    // Multi-chat state
    this.openChats = new Map(); // tabId -> { id, title, messages, isGenerating, pendingRequestId }
    this.chatTabCounter = 0;
    this.lastActiveChatTab = null; // For persistence
    // Message routing safety - tracks which tab initiated which request
    this.activeRequests = new Map(); // requestId -> tabId
    // Event listeners
    this.eventListeners = [];

    this.init();
  }

  // Debounced version for scroll events
  debouncedSaveEditorState = this.debounce(() => this.saveEditorState(), 500);

  async init() {
    // Load config
    this.config = await window.electronAPI.getConfig();
    this.activeFilePath = this.config.activeFile || null; // Restore from settings

    if (this.config.lastWorkspace  && !this.workspacePath) {
      this.workspacePath = this.config.lastWorkspace;

      await this.loadWorkspace(this.config.lastWorkspace);
      await this.restoreEditorState();

      // Re-apply active file class in tree if needed
      if (this.activeFilePath) {
        const el = document.querySelector(`[data-path="${CSS.escape(this.activeFilePath)}"]`);

        if (el)
          el.classList.add('active-file');
      }
    }

    // Try preload first, then fall back to CDN global
    if (window.electronAPI?.loadTransformers) {
        this.transformers = await window.electronAPI.loadTransformers();
    }
    else {
      this.transformers = window.transformers || window.Transformers;
    }

    // Setup download progress listener (for Ollama)
    window.electronAPI.onDownloadProgress((data) => {
      this.updateDownloadProgress(data);
    });

    this.showWelcomeHub = !this.config.hideWelcomeHub;

    this.setupEventListeners();
    await this.setupTheme();

    if (!this.config || !this.config.modelType) {
      console.log('First run - showing model selection');
      this.showFirstRunModal();
    }
    else {
      this.currentModel = this.config.modelType;

      if (this.currentModel === 'tinyllama' && this.transformers) {
        await this.initTinyLlama();
      }

      else {
        await this.populateOllamaModels();
      }
    }

    await this.loadCurrentChatFromJson();

    document.getElementById('app').classList.remove('hidden');
    this.initMonaco();

    window.electronAPI.onFileSystemEvent((data) => {
      this.handleFileSystemChange(data);
    });

    this.renderWelcomeHub();

    window.addEventListener('beforeunload', async () => {
      await this.saveEditorState();
      this.cleanupEventListeners();
    });
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  setTabUnreadIndicator(tabId, hasUnread) {
    const tab = document.querySelector(`[data-tab="${tabId}"]`);
    if (tab) {
      tab.classList.toggle('has-unread', hasUnread);
    }
  }

  setupResizeHandle() {
    const history = document.querySelector('.build-history');
    const output = document.querySelector('.build-output');
    const handle = document.createElement('div');

    handle.className = 'resize-handle';

    let isResizing = false;
    let startY, startHeight;

    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = history.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const delta = startY - e.clientY;
      const newHeight = Math.max(40, Math.min(startHeight + delta, 400));
      history.style.height = `${newHeight}px`;
      // Optional: Save to config
      this.config.buildHistoryHeight = newHeight;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.electronAPI.setConfig({ buildHistoryHeight: this.config.buildHistoryHeight });
      }
    });

    history.insertBefore(handle, history.firstChild);
  }

  async initBuildSystem() {
      await this.detectProjectBuildConfig();
  }

  async detectProjectBuildConfig() {
    const result = await window.electronAPI.detectBuildConfig(this.workspacePath);

    if (result.success && result.config.language) {
      this.currentBuildConfig = result.config;
      this.updateBuildStatus(`Detected ${result.config.language} project`);
      this.renderBuildPanel();
    }
    else {
      this.updateBuildStatus('No build configuration detected');
    }
  }

  _buildTemplate(type, data) {
    if (type === 'empty') {
      return `
        </div>
        <div class="build-empty">
          <button class="btn-icon no-workspace-close" onclick="app.toggleBuildPanel()" title="Close build panel" style="margin-left: auto; ">
            ✕
          </button>
          <div class="icon">${data.icon}</div>
         <div class="message">${data.message}</div>
          <div class="subtitle">Open a project folder to detect build configuration and start building</div>
          <button class="action-btn" onclick="app.selectWorkspace()">Select Workspace</button>
        </div>
      `;
    }

    else {
      return `
        <div class="build-header">
            <div class="build-project-info">
                <div class="build-lang-icon">${data.icon}</div>
                <div class="build-details">
                    <div class="build-lang">${data.language.toUpperCase()}</div>
                    <div class="build-system">${data.detectedFiles}</div>
                </div>
            </div>
            <button class="btn-icon" onclick="app.toggleBuildPanel()" title="Close build panel" style="margin-left: auto; ">✕</button>
        </div>
        <div class="build-actions">
            <button class="build-btn" onclick="app.runBuild()" title="Build project">Build</button>
            <button class="build-btn" onclick="app.runInstall()" title="Install dependencies">Install</button>
            <button class="build-btn" onclick="app.runTest()" title="Run tests">Test</button>
            ${data.language === 'javascript' || data.language === 'typescript' ?
            `<button class="build-btn" onclick="app.runScript('start')" title="Run start script">Run</button>` : ''}
        </div>
          <div class="build-output">
            <div class="build-output-header">
              <span>Output</span>
              <button class="btn-icon" onclick="app.clearBuildOutput()" title="Clear output">Clear</button>
            </div>
            <div id="build-output-content" class="build-output-content">
              <div class="build-starting">Ready to build...</div>
            </div>
          </div>
          <div class="build-history">
            <div class="build-section-title">Recent Builds</div>
            <div id="build-history-list" class="build-history-list"></div>
          </div>
      `;
    }
  }

  renderBuildPanel() {
    const panel = document.getElementById('build-panel');

    if (!panel.classList.contains('visible'))
      return;

    if (!this.workspacePath || this.workspacePath === null) {
      panel.innerHTML = this._buildTemplate('empty', {
        message: 'No Workspace Selected',
        icon: '📂'
      });
      return;
    }

    const config = this.currentBuildConfig;

    if (!config?.buildSystem || !config) {
      panel.innerHTML = this._buildTemplate('empty', {
        message: 'Open a workspace to detect build configuration',
        icon: '🔧'
      });
      return;
    }

    // Unified template generator
    panel.innerHTML = this._buildTemplate('panel', {
      language: config.language,
      icon: this.getLanguageIcon(config.language),
      detectedFiles: config.detectedFiles.join(', '),
      scriptsHtml: config.availableScripts ? this._renderScriptButtons(config.availableScripts) : '',
      actionsHtml: this._renderBuildActions(config)
    });

    if (this.config.buildHistoryHeight) {
      document.querySelector('.build-history').style.height =
        `${this.config.buildHistoryHeight}px`;
    }

    this.loadBuildHistory();
    this.setupResizeHandle();
  }

  _renderScriptButtons(scripts) {
    const priority = ['build', 'start', 'dev', 'test', 'lint'];
    const sorted = [...scripts].sort((a, b) => {
      const aIdx = priority.indexOf(a);
      const bIdx = priority.indexOf(b);

      if (aIdx === -1 && bIdx === -1)
        return a.localeCompare(b);

      return aIdx === -1 ? 1 : bIdx === -1 ? -1 : aIdx - bIdx;
    });

    return sorted.slice(0, 6).map(script =>
      `<button class="btn-script" onclick="app.runScript('${script}')">${script}</button>`
    ).join('');
  }

  _renderBuildActions(config) {
    const bs = config.buildSystem;

    return `
      <button onclick="app.executeBuild('build', '${bs.defaultCommand}', ${JSON.stringify(bs.defaultArgs)})">Build</button>
      <button onclick="app.executeBuild('install', '${bs.installCommand[0]}', ${JSON.stringify(bs.installCommand.slice(1))})">Install</button>
    `;
  }

  getLanguageIcon(lang) {
    const icons = {
      javascript: 'JS',
      typescript: 'TS',
      python: '🐍',
      rust: 'RS',
      go: 'GO',
      java: 'JV',
      csharp: 'C#',
      cpp: 'C++'
    };
    return icons[lang] || 'Code';
  }

  async runBuild() {
    if (!this.currentBuildConfig)
      return;

    const bs = this.currentBuildConfig.buildSystem;
    await this.executeBuild('build', bs.defaultCommand, bs.defaultArgs);
  }

  async runInstall() {
    if (!this.currentBuildConfig)
      return;

    const bs = this.currentBuildConfig.buildSystem;
    await this.executeBuild('install', bs.installCommand[0], bs.installCommand.slice(1));
  }

  async runTest() {
    if (!this.currentBuildConfig)
      return;

    const bs = this.currentBuildConfig.buildSystem;
    await this.executeBuild('test', bs.testCommand[0], bs.testCommand.slice(1));
  }

  async runScript(scriptName) {
    await this.executeBuild(`script:${scriptName}`, 'npm', ['run', scriptName]);
  }

  async executeBuild(buildType, command, args) {
    const buildId = `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const outputContainer = document.getElementById('build-output-content');

    // Clear previous output for new build
    if (outputContainer) {
      outputContainer.innerHTML = `<div class="build-starting">Starting ${buildType}...</div>`;
    }

    try {
      this.activeBuilds.set(buildId, { type: buildType, startTime: Date.now() });

      const result = await window.electronAPI.executeBuild(buildId, command, args, {
        cwd: this.workspacePath
      });

      if (result.success) {
        this.appendBuildOutput(`\n✓ Build completed in ${result.result.duration}ms\n`, 'success');
        this.updateBuildStatus(`${buildType} completed`);
      }
      else {
        this.appendBuildOutput(`\n✗ Build failed (Exit code: ${result.exitCode})\n${result.stderr || result.error}\n`, 'error');
        this.updateBuildStatus(`${buildType} failed`);

        // Offer AI analysis
        this.showErrorAnalysis(result, buildType);
      }
    }
    catch (e) {
      this.appendBuildOutput(`\n✗ Error: ${e.message}\n`, 'error');
    }
    finally {
      this.activeBuilds.delete(buildId);
      this.loadBuildHistory();
    }
  }

  handleBuildProgress(data) {
    const { buildId, type, data: content } = data;
    const prefix = type === 'stderr' ? '[stderr] ' : '';
    this.appendBuildOutput(prefix + content, type);
  }

  appendBuildOutput(text, type = 'stdout') {
    const container = document.getElementById('build-output-content');

    if (!container)
      return;

    const line = document.createElement('div');
    line.className = `build-line build-${type}`;
    line.textContent = text;

    container.appendChild(line);
    container.scrollTop = container.scrollHeight;

    // Limit lines
    while (container.children.length > 1000) {
      container.removeChild(container.firstChild);
    }
  }

  clearBuildOutput() {
    const container = document.getElementById('build-output-content');

    if (container)
      container.innerHTML = '';
  }

  async loadBuildHistory() {
    try {
      const result = await window.electronAPI.getBuildHistory(10);

      if (result.success) {
        this.renderBuildHistory(result.history);
      }
    }
    catch (e) {
      console.error('Failed to load build history:', e);
    }
  }

  renderBuildHistory(history) {
    const container = document.getElementById('build-history-list');
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = '<div class="build-empty-history">No builds yet</div>';
      return;
    }

    container.innerHTML = history.map(build => `
      <div class="build-history-item build-status-${build.status}">
        <div class="build-history-info">
          <span class="build-history-command">${this.truncate(build.command, 30)}</span>
          <span class="build-history-time">${new Date(build.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="build-history-meta">
          <span class="build-history-duration">${(build.duration / 1000).toFixed(1)}s</span>
          <span class="build-history-status">${build.status}</span>
        </div>
      </div>
    `).join('');
  }

  showErrorAnalysis(result, buildType) {
    const panel = document.getElementById('build-output-container');

    if (!panel)
      return;

    const analysisDiv = document.createElement('div');
    analysisDiv.className = 'build-error-analysis';
    analysisDiv.innerHTML = `
      <div class="build-analysis-header">
        <span>Build failed. Analyze with AI?</span>
        <button class="btn-primary" onclick="app.analyzeBuildError('${buildType}')">Analyze Error</button>
      </div>
    `;

    panel.appendChild(analysisDiv);
  }

  async analyzeBuildError(buildType) {
    // Integrate with chat system
    const buildData = Array.from(this.activeBuilds.values()).find(b => b.type === buildType);

    if (!buildData)
      return;

    // Add message to chat requesting analysis
    const message = `Please analyze the build error for ${this.currentBuildConfig?.language} project. Check the build output above.`;
    await this.sendMessage(message);
  }

  truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  updateBuildStatus(text) {
    const statusEl = document.getElementById('build-status');

    if (statusEl)
      statusEl.textContent = text;
  }

  toggleBuildPanel() {
    const panel = document.getElementById('build-panel');
    const btn = document.getElementById('build-toggle-btn');

    if (!panel)
      return;

    const isCurrentlyVisible = panel.classList.contains('visible');

    if (isCurrentlyVisible) {
      panel.classList.remove('visible');

      if (btn) {
        btn.classList.remove('active');
        btn.title = 'Show Build Panel';
      }
    }
    else {
      panel.classList.add('visible');
      panel.classList.remove('hidden');

      if (btn) {
        btn.classList.add('active');
        btn.title = 'Hide Build Panel';
      }

      if (!this.currentBuildConfig && this.workspacePath) {
        this.detectProjectBuildConfig();
      }
      else {
        this.renderBuildPanel();
      }
    }
  }

  // Events that perform actions on HTML elements
  setupEventListeners() {
    window.electronAPI.onBuildProgress((data) => {
      this.handleBuildProgress(data);
    });

    /**
     *  Helper function to attach listeners to DOM elements
     *
     *  @param {object} element - The DOM element to attach the listener to
     *  @param {string} event - The event that we connect with the element
     *  @param {function} handler - The function that triggers on event
     */
    const addListener = (element, event, handler) => {
      if (!element)
        return;

      element.addEventListener(event, handler);
      this.eventListeners.push({ element, event, handler });
    };

    const addIpcListener = (channel, handler) => {
      const unsubscribe = window.electronAPI[channel](handler);

      this.eventListeners.push({ type: 'ipc', unsubscribe });
    };

    addIpcListener('onDownloadProgress', (data) => {
      this.updateDownloadProgress(data);
    });

    addIpcListener('onFileSystemEvent', (data) => {
      this.handleFileSystemChange(data);
    });

    addIpcListener('onBuildProgress', (data) => {
      this.handleBuildProgress(data);
    });

    addListener(
      document.querySelector('[data-tab="chat"]'),
      'click',
      () => this.switchToTab('chat')
    );

    addListener(
      document.getElementById('build-toggle-btn'),
      'click', () => this.toggleBuildPanel()
    );

    addListener(
      document,
      'keydown', (e) => {
        if (e.key === 'Escape') {
          const panel = document.getElementById('build-panel');

          if (panel?.classList.contains('visible')) {
            this.toggleBuildPanel()
          }
        }
      }
    );

    addListener(
      document.getElementById('btn-pause-download'),
      'click', () => this.togglePauseDownload()
    );

    addListener(
      document.getElementById('btn-stop-download'),
      'click', () => {
        this.stopDownload();
        this.showFirstRunModal();
      }
    );

    addListener(
      document.getElementById('btn-cancel-download'),
      'click', () => this.cancelDownload()
    );

    addListener(
      document.getElementById('option-tinyllama'),
      'click', () => {
        console.log('TinyLlama selected');
        this.selectModel('tinyllama');
      }
    );

    // Ollama option - Requires external Ollama
    addListener(
      document.getElementById('option-ollama'),
      'click', () => {
        console.log('Ollama selected');
        this.selectModel('ollama');
      }
    );

    addListener(
      document.getElementById('btn-settings'),
      'click',  () => this.showSettingsModal()
    );

    addListener(
      document.getElementById('btn-select-workspace'),
      'click', () => this.selectWorkspace()
    );

    addListener(
      document.getElementById('btn-refresh-index'),
      'click', () => this.rebuildIndex()
    );

    addListener(
      document.getElementById('btn-send'),
      'click', () => this.sendMessage()
    );

    addListener(
      document.getElementById('chat-input'),
      'keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      }
    );

    addListener(
      document.getElementById('insert-file'),
      'click', () => this.selectFiles()
    );

    addListener(
      document.getElementById('chat-input'),
      'input', (e) => {
        const textarea = e.target;
        const minHeight = 60;
        const maxHeight = 320;
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
        const threshold = lineHeight * 2; // Don't expand until 1.5 lines needed

        // Reset to auto to allow shrinking measurement
        textarea.style.height = 'auto';

        // Explicitly handle empty/whitespace-only to ensure shrinking
        if (textarea.value.trim().length === 0) {
            textarea.style.height = minHeight + 'px';
            return;
        }

        const scrollHeight = textarea.scrollHeight;

        // Only expand if content exceeds minHeight + threshold
        // This prevents expansion for the first 1-2 characters
        if (scrollHeight > minHeight + threshold) {
            textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        }
        else {
            // Stay at minimum height
            textarea.style.height = minHeight + 'px';
        }
      }
    );

    addListener(
      document.getElementById('ollama-model-selector'),
      'change', (e) => {
        this.currentOllamaModel = e.target.value;
        // Optionally save to config
        window.electronAPI.setConfig({
          modelType: 'ollama',
          modelName: this.currentOllamaModel
        });
      }
    );

    addListener(
      document.getElementById('history'),
      'click',  () => this.showHistoryModal()
    );

    addListener(
      document.getElementById('btn-close-history'),
      'click', () => this.closeHistoryModal()
    );

    addListener(
      document.getElementById('btn-new-chat'),
      'click', () => {
        this.createChatTab();
        this.closeHistoryModal();
      }
    );

    addListener(
      document.getElementById('btn-new-chat-tab'),
      'click', () => this.createChatTab()
    );
  }

  cleanupEventListeners() {
    this.eventListeners.forEach(listener => {
      if (listener.type === 'ipc') {
        listener.unsubscribe();
      }
      else {
        // Standard DOM listener
        listener.element?.removeEventListener(listener.event, listener.handler);
      }
    });

    // Clear the array
    this.eventListeners = [];

    // Also clear any lingering timeouts
    clearTimeout(this.fsChangeTimeout);
    clearTimeout(this.hubUpdateTimeout);
  }

  showFirstRunModal() {
    document.getElementById('first-run-modal')?.classList.remove('hidden');
    document.getElementById('download-modal')?.classList.add('hidden');
  }

  togglePauseDownload() {
    if (!this.isDownloading && !this.downloadPaused)
      return;

    this.downloadPaused = !this.downloadPaused;

    const btn = document.getElementById('btn-pause-download');
    const pauseIcon = document.getElementById('icon-pause');
    const resumeIcon = document.getElementById('icon-resume');
    const statusEl = document.getElementById('download-status');

    if (this.downloadPaused) {
      btn.title = 'Resume';

      if (pauseIcon)
        pauseIcon.classList.add('hidden');

      if (resumeIcon)
        resumeIcon.classList.remove('hidden');

      if (statusEl)
        statusEl.textContent = 'Download paused';

      // Abort current fetch to free resources
      if (this.downloadAbortController) {
        this.downloadAbortController.abort();
      }
    }
    else {
      btn.title = 'Pause';

      if (pauseIcon)
        pauseIcon.classList.remove('hidden');

      if (resumeIcon)
        resumeIcon.classList.add('hidden');

      if (statusEl)
        statusEl.textContent = 'Resuming from checkpoint...';

      this.resumeDownload();
    }
  }

  async resumeDownload() {
    this.downloadPaused = false;
    this.downloadState.isResuming = true;
    this.isDownloading = false;

    try {
      await this.selectModel('tinyllama');
    }
    catch (e) {
      if (e.message === 'PAUSED') {
        console.log('Download paused by user');
      } else {
        console.error('Resume failed:', e);
        this.updateStatus('Resume failed');
      }
    }
  }

  async downloadModelFiles(progressCallback) {
    const modelId = 'Xenova/TinyLlama-1.1B-Chat-v1.0';
    const baseUrl = `https://huggingface.co/${modelId}/resolve/main/`;

    for (let i = this.downloadState.currentFileIndex; i < this.downloadState.filesToDownload.length; i++) {
      const fileInfo = this.downloadState.filesToDownload[i];
      this.downloadState.currentFileIndex = i;

      try {
        await this.downloadFileWithResume(
          baseUrl + fileInfo.remote,
          fileInfo.local,
          (fileProgress) => {
            // Calculate overall progress across all files
            const overallLoaded = this.downloadState.bytesDownloaded + fileProgress.loaded;
            const overallTotal = this.downloadState.totalBytes ||
              (fileProgress.total * this.downloadState.filesToDownload.length);

            progressCallback?.({
              status: 'progress',
              loaded: overallLoaded,
              total: overallTotal
            });
          }
        );

        // Update accumulated bytes after each file
        const fileSize = await window.electronAPI.getDownloadedFileSize?.(fileInfo.local) || 0;
        this.downloadState.bytesDownloaded += fileSize;
      }
      catch (e) {
        if (e.message === 'PAUSED') {
          // Save current state before throwing
          await window.electronAPI.saveDownloadState?.('tinyllama', {
            currentFileIndex: i,
            bytesDownloaded: this.downloadState.bytesDownloaded,
            complete: false
          });
          throw e;
        }
        throw e;
      }
    }

    // Mark as complete
    await window.electronAPI.saveDownloadState?.('tinyllama', { complete: true });
    this.downloadState.isResuming = false;
  }

  async downloadFileWithResume(url, fileName, onProgress) {
    // Get existing partial download info
    const fileState = await window.electronAPI.getFileDownloadState?.(fileName) || {
      downloaded: 0,
      total: 0,
      etag: null
    };

    if (fileState.complete) {
      onProgress({ status: 'progress', loaded: fileState.total, total: fileState.total });
      return;
    }

    const headers = {};
    if (fileState.downloaded > 0) {
      headers['Range'] = `bytes=${fileState.downloaded}-`;
      if (fileState.etag) {
        headers['If-Match'] = fileState.etag; // Ensure file hasn't changed
      }
    }

    try {
      this.downloadAbortController = new AbortController();

      const response = await fetch(url, {
        headers,
        signal: this.downloadAbortController.signal
      });

      if (fileState.downloaded > 0 && response.status !== 206) {
        throw new Error('Server does not support resume. Restarting download.');
      }

      const contentLength = response.headers.get('Content-Length');
      const total = parseInt(contentLength) + fileState.downloaded;
      const etag = response.headers.get('ETag');

      const reader = response.body.getReader();
      let downloaded = fileState.downloaded;

      while (true) {
        // Check for pause signal
        if (this.downloadPaused) {
          await window.electronAPI.saveFileDownloadState?.(fileName, {
            downloaded,
            total,
            etag,
            complete: false
          });
          throw new Error('PAUSED');
        }

        const { done, value } = await reader.read();

        if (done) {
          await window.electronAPI.saveFileDownloadState?.(fileName, {
            downloaded,
            total,
            etag,
            complete: true
          });
          break;
        }

        // Write chunk to disk via Electron API
        await window.electronAPI.writeDownloadChunk?.(fileName, value, downloaded);
        downloaded += value.length;

        onProgress({ status: 'progress', loaded: downloaded, total });
      }
    }
    catch (e) {
      if (e.name === 'AbortError') {
        // Save current progress for resume
        await window.electronAPI.saveFileDownloadState?.(fileName, {
          ...fileState,
          downloaded: fileState.downloaded,
          complete: false
        });
        throw new Error('PAUSED');
      }
      throw e;
    }
  }

  stopDownload() {
    if (!this.isDownloading) return;

    // Abort current download
    if (this.downloadAbortController) {
      this.downloadAbortController.abort();
      this.downloadAbortController = null;
    }

    this.isDownloading = false;
    this.downloadPaused = false;

    // Discard all downloaded chunks
    window.electronAPI.clearDownloadState?.('tinyllama').catch(console.error);
    window.electronAPI.clearDownloadChunks?.().catch(console.error);

    // Reset state
    this.downloadState = {
      isResuming: false,
      currentFileIndex: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      filesToDownload: [
        { remote: 'config.json', local: 'models/Xenova/TinyLlama-1.1B-Chat-v1.0/config.json' },
        { remote: 'tokenizer.json', local: 'models/Xenova/TinyLlama-1.1B-Chat-v1.0/tokenizer.json' },
        { remote: 'tokenizer_config.json', local: 'models/Xenova/TinyLlama-1.1B-Chat-v1.0/tokenizer_config.json' },
        { remote: 'onnx/decoder_model_merged_quantized.onnx', local: 'models/Xenova/TinyLlama-1.1B-Chat-v1.0/onnx/decoder_model_merged_quantized.onnx' }
      ]
    };

    // Reset UI
    document.getElementById('download-modal')?.classList.add('hidden');
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-text').textContent = '0%';

    this.updateStatus('Download stopped');
  }

  cancelDownload() {
    // Stop and discard everything
    this.stopDownload();

    // Restore first run modal
    this.showFirstRunModal();

    // Reset config
    this.config = {};
    window.electronAPI.setConfig({ modelType: null, modelName: null });
  }

  renderWelcomeHub() {
    const hub = document.getElementById('welcome-hub');
    const container = document.getElementById('chat-messages');

    if (!this.showWelcomeHub ||
        this.currentChat.messages.length > 0 ||
        this.currentChat.id)
    {
        hub?.classList.add('hidden');
        return;
    }

    hub?.classList.remove('hidden');

    const icon = document.getElementById('hub-icon');
    const title = document.getElementById('hub-title');
    const subtitle = document.getElementById('hub-subtitle');
    const suggestions = document.getElementById('hub-suggestions');

    // Clear previous listeners by cloning
    const newHub = hub.cloneNode(true);
    hub.parentNode.replaceChild(newHub, hub);

    // Re-get elements after clone
    const newIcon = newHub.querySelector('#hub-icon');
    const newTitle = newHub.querySelector('#hub-title');
    const newSubtitle = newHub.querySelector('#hub-subtitle');
    const newSuggestions = newHub.querySelector('#hub-suggestions');

    if (!this.workspacePath) {
      // No workspace yet
      if (this.currentModel === 'tinyllama') {
        newTitle.textContent = 'Ready to collaborate';
        newSubtitle.textContent = 'TinyLlama runs entirely on your machine - no setup needed. Open a workspace folder to analyze your code, ';
        newSubtitle.textContent = newSubtitle.textContent + 'or ask to generate a new project';
        newSuggestions.innerHTML = `
          <button class="hub-suggestion-btn" onclick="app.selectWorkspace()">
            <div class="suggestion-icon">📂</div>
            <div class="suggestion-content">
                <div class="suggestion-title">Open workspace folder</div>
                <div class="suggestion-desc">Browse and analyze your local code repository</div>
            </div>
        </button>
        <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Help me understand how to use this app')">
            <div class="suggestion-icon">💡</div>
            <div class="suggestion-content">
                <div class="suggestion-title">How does this work?</div>
                <div class="suggestion-desc">Learn about features and keyboard shortcuts</div>
            </div>
        </button>
        `;
      }
      else {
        // Ollama - emphasize the setup requirement, not "advanced"
        newTitle.textContent = 'Ready to collaborate';
        newSubtitle.textContent = 'Ollama lets you use open-source models (such as Mistral, Kimi, Deepseek, etc) either locally or via cloud.';
        newSubtitle.textContent = newSubtitle.textContent + ' This requires Ollama installation';
        newSuggestions.innerHTML = `
          <button class="hub-suggestion-btn" onclick="app.selectWorkspace()">
            <span>📂</span> Open workspace folder
          </button>
          <button class="hub-suggestion-btn" onclick="window.open('https://ollama.com', '_blank')">
            <span>🔗</span> Get Ollama app
          </button>
          <button class="hub-suggestion-btn" onclick="app.showSettingsModal()">
            <span>⚙️</span> Choose model
          </button>
        `;
      }
    }
    else {
      // Workspace is open - focus on workspace questions, not "selected files"
      const hasFiles = this.workspaceIndex && this.workspaceIndex.index.size > 0;

      if (this.currentModel === 'tinyllama') {
        newTitle.textContent = 'Ready to collaborate';
        newSubtitle.textContent = 'What shall we work on?';

        newSuggestions.innerHTML = `
          <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Explain what this project does')">
            <div class="suggestion-icon">🔍</div>
            <div class="suggestion-content">
                <div class="suggestion-title">Explain the codebase</div>
                <div class="suggestion-desc">Get an overview of the project structure and purpose</div>
            </div>
        </button>
        <button class="hub-suggestion-btn" onclick="app.sendSuggestion('How do I run this project?')">
            <div class="suggestion-icon">🚀</div>
            <div class="suggestion-content">
                <div class="suggestion-title">Getting started</div>
                <div class="suggestion-desc">Find setup instructions and dependencies</div>
            </div>
        </button>
        <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Find potential bugs')">
            <div class="suggestion-icon">🐛</div>
            <div class="suggestion-content">
                <div class="suggestion-title">Check for issues</div>
                <div class="suggestion-desc">Scan for common bugs and code smells</div>
            </div>
        </button>
        `;
      }
      else {
        newTitle.textContent = 'Ready to collaborate';
        newSubtitle.textContent = 'What shall we work on?';

        newSuggestions.innerHTML = `
          <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Review the architecture')">
              <div class="suggestion-icon">🏗️</div>
              <div class="suggestion-content">
                  <div class="suggestion-title">Architecture review</div>
                  <div class="suggestion-desc">Analyze design patterns and structure</div>
              </div>
          </button>
          <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Optimize for performance')">
              <div class="suggestion-icon">⚡</div>
              <div class="suggestion-content">
                  <div class="suggestion-title">Optimize code</div>
                  <div class="suggestion-desc">Identify bottlenecks and improve efficiency</div>
              </div>
          </button>
          <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Security audit')">
              <div class="suggestion-icon">🔒</div>
              <div class="suggestion-content">
                  <div class="suggestion-title">Security check</div>
                  <div class="suggestion-desc">Scan for vulnerabilities and best practices</div>
              </div>
          </button>
          <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Generate documentation')">
              <div class="suggestion-icon">📝</div>
              <div class="suggestion-content">
                  <div class="suggestion-title">Document code</div>
                  <div class="suggestion-desc">Create README and inline documentation</div>
              </div>
          </button>
        `;
      }
    }

    // Add hide listener
    newHub.querySelector('#btn-hide-hub')?.addEventListener('click', () => {
      this.toggleWelcomeHub(false);
    });
  }

  async sendSuggestion(text) {
    // Hide welcome hub immediately for better UX
    const hub = document.getElementById('welcome-hub');
    if (hub) {
      hub.classList.add('hidden');
    }

    // Send directly to LLM without waiting for user to press Enter
    await this.sendMessage(text);
  }

  suggestQuery(text) {
    const input = document.getElementById('chat-input');
    input.value = text;
    input.focus();

    const minHeight = 60;
    const maxHeight = 320;
    const lineHeight = parseInt(getComputedStyle(input).lineHeight);
    const threshold = lineHeight * 2; // Don't expand until 1.5 lines needed

    // Reset to auto to allow shrinking measurement
    input.style.height = 'auto';

    const scrollHeight = input.scrollHeight;

    // Only expand if content exceeds minHeight + threshold
    // This prevents expansion for the first 1-2 characters
    if (scrollHeight > minHeight + threshold) {
        input.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
    else {
        // Stay at minimum height
        input.style.height = minHeight + 'px';
    }
  }

  async toggleWelcomeHub(show) {
    this.showWelcomeHub = show;
    await window.electronAPI.setConfig({ hideWelcomeHub: !show });

    this.renderWelcomeHub();

    // Show toast confirmation
    if (!show) {
      this.updateStatus('Welcome tips hidden. Re-enable in Settings.');
    }
  }

  //
  async initTinyLlama(progressCallback = null) {
    if (!this.transformers) {
      throw new Error('Transformers.js library not loaded');
    }

    console.log('Initializing TinyLlama...');
    const { pipeline, env } = this.transformers;

    // Configure cache directory for resumable downloads
    const modelCachePath = await window.electronAPI.getModelCachePath?.();

    if (modelCachePath) {
      env.cacheDir = modelCachePath;
    }

    // Check if we need to download or resume
    const savedState = await window.electronAPI.getDownloadState?.('tinyllama');

    if (savedState && !savedState.complete) {
      this.downloadState.isResuming = true;
      this.downloadState.currentFileIndex = savedState.currentFileIndex || 0;
      this.downloadState.bytesDownloaded = savedState.bytesDownloaded || 0;
    }

    // Download files with resume support before loading pipeline
    if (!savedState?.complete || this.downloadState.isResuming) {
      await this.downloadModelFiles(progressCallback);
    }

    const modelFilesExist = await this.checkModelFilesExist();

    // Load from local files once downloaded
    this.tinyLlamaPipeline = await pipeline(
      'text-generation',
      'Xenova/TinyLlama-1.1B-Chat-v1.0',
      {
        progress_callback: progressCallback || ((x) => console.log('Loading:', x.status, x)),
        quantized: true,
        local_files_only: modelFilesExist // Use downloaded files
      }
    );

    // Clear download state on success
    await window.electronAPI.clearDownloadState?.('tinyllama');

    // Save config after successful initialization
    await window.electronAPI.setConfig({
      modelType: 'tinyllama'
    });
  }

  async selectModel(modelType) {
    if (this.isDownloading || this.downloadPaused)
      return;

    this.isDownloading = true;

    // Only show download UI for TinyLlama
    if (modelType === 'tinyllama') {
      document.getElementById('first-run-modal')?.classList.add('hidden');
      document.getElementById('download-modal')?.classList.remove('hidden');
      this.currentModel = 'tinyllama';
    }

    const statusEl = document.getElementById('download-status');
    const fillEl = document.getElementById('progress-fill');
    const textEl = document.getElementById('progress-text');

    if (fillEl)
      fillEl.style.width = '0%';

    if (textEl)
      textEl.textContent = '0%';

    try {
      if (modelType === 'tinyllama') {
        document.getElementById('first-run-modal')?.classList.add('hidden');
        document.getElementById('download-modal')?.classList.remove('hidden');

        const statusEl = document.getElementById('download-status');
        const fillEl = document.getElementById('progress-fill');
        const textEl = document.getElementById('progress-text');

        if (fillEl)
          fillEl.style.width = '0%';

        if (textEl)
          textEl.textContent = '0%';

        try {
          await this.initTinyLlama((progress) => {
            if (progress.status === 'progress') {
              const percent = Math.round((progress.loaded / progress.total) * 100);

              if (fillEl)
                fillEl.style.width = `${percent}%`;

              if (textEl)
                textEl.textContent = `${percent}%`;

              if (statusEl)
                statusEl.textContent = `Downloading: ${percent}%`;
            }
          });
        }
        catch (e) {
          if (e.message !== 'PAUSED') {
            console.error('TinyLlama download failed:', e);

            if (statusEl)
              statusEl.textContent = `Error: ${e.message}`;
          }
        }
      }
      else {
        // Ollama path: Hide first-run modal immediately
        document.getElementById('first-run-modal')?.classList.add('hidden');

        await window.electronAPI.setConfig({
          modelType: 'ollama',
          modelName: null
        });

        this.currentModel = 'ollama';
        this.updateStatus('Ready: Ollama (select model below)');

        // Delay slightly to ensure DOM is ready, then populate
        setTimeout(async () => {
          try {
            await this.populateOllamaModels();

            // Only save config after we have the model name
            if (this.currentOllamaModel) {
              await window.electronAPI.setConfig({
                modelType: 'ollama',
                modelName: this.currentOllamaModel
              });
              this.updateStatus(`Ready: Ollama (${this.currentOllamaModel})`);
            }
            else {
              // No models found or Ollama not running
              await window.electronAPI.setConfig({
                modelType: 'ollama',
                modelName: null
              });
              this.updateStatus('Ollama connected but no models found');
            }
          }
          catch (ollamaErr) {
            console.error('Failed to populate Ollama models:', ollamaErr);
            this.updateStatus('Ollama selected (model list unavailable)');
          }
        }, 100);
      }

      this.config = await window.electronAPI.getConfig();

      // Only hide download modal if it was shown (TinyLlama case handled in finally)
      if (modelType !== 'tinyllama') {
        document.getElementById('download-modal')?.classList.add('hidden');
      }
    }
    catch (e) {
      // Don't reset to first run for Ollama errors unless it's a config error
      if (e.message === 'PAUSED' || !this.isDownloading) {
        return;
      }

      if (modelType === 'tinyllama') {
        document.getElementById('download-modal')?.classList.add('hidden');
        this.showFirstRunModal();
      }
      else {
        console.error('Ollama setup error:', e);
        this.updateStatus('Error setting up Ollama: ' + e.message);
      }
    }
    finally {
      this.isDownloading = false;
      document.getElementById('download-modal')?.classList.add('hidden');

      setTimeout(() => this.renderWelcomeHub(), 300);
    }
  }

  async checkModelFilesExist() {
    try {
      const modelCachePath = await window.electronAPI.getModelCachePath?.();
      if (!modelCachePath) return false;

      // Check if at least one essential model file exists
      const essentialFiles = ['config.json', 'tokenizer.json'];

      for (const file of essentialFiles) {
        const filePath = `${modelCachePath}/Xenova/TinyLlama-1.1B-Chat-v1.0/${file}`;
        const exists = await window.electronAPI.checkFileExists?.(filePath);

        if (!exists)
          return false;

        return true;
      }
    }
    catch (e) {
      return false;
    }
  }

  async populateOllamaModels() {
    let selector = this.ollamaModelSelect;

    if (!selector || !document.contains(selector)) {
      selector = document.getElementById('ollama-model-selector');
      this.ollamaModelSelect = selector;
    }

    if (!selector) {
      console.warn('Ollama model selector not found in DOM, updating state only');
    }
/*
    if (this.currentModel !== 'ollama') {
        selector.classList.add('hidden');
        return;
    }*/

    try {
        const result = await window.electronAPI.getOllamaModels();

        // Safely handle cases where models might be null/undefined or not an array
        const models = Array.isArray(result.models) ? result.models : [];

        if (result.success && models.length > 0) {
          this.availableOllamaModels = models;

          if (selector) {
            selector.innerHTML = models.map(m =>
                `<option value="${m.name}" ${m.name === this.currentOllamaModel ? 'selected' : ''}>${m.name}</option>`
            ).join('');
            selector.classList.remove('hidden');
          }

          // Auto-select first model regardless of DOM state
          if (!this.currentOllamaModel) {
            this.currentOllamaModel = models[0].name;

            if (selector) {
                selector.value = this.currentOllamaModel;
            }

            // Persist selection immediately so it's available for chat
            await window.electronAPI.setConfig({
                modelType: 'ollama',
                modelName: this.currentOllamaModel
            });
          }
        }
        else if (result.success) {
            // Ollama is running but has no models pulled
            selector.innerHTML = '<option value="">No models installed (run: ollama pull)</option>';
            selector.classList.remove('hidden');
            this.currentOllamaModel = null; // Explicitly null when empty
        }
        else {
            throw new Error(result.error || 'Failed to fetch models');
        }
    }
    catch (e) {
        console.error('Failed to get Ollama models:', e);
        selector.innerHTML = '<option value="">Ollama not running</option>';
        selector.classList.remove('hidden');
        this.currentOllamaModel = null; // Explicitly null on error
    }
  }

  addMessageToTab(tabId, role, content, isLoading = false) {
    const container = document.getElementById(`chat-messages-${tabId}`);

    if (!container)
      return null;

    const id = `msg-${Date.now()}`;
    const div = document.createElement('div');
    div.id = id;
    div.className = `message ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = isLoading ? content : this.parseMarkdown(content);

    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    if (typeof hljs !== 'undefined' && !isLoading) {
      bubble.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    }

    return id;
  }

  async sendMessage(text = null, targetTabId = null) {
    const config = await window.electronAPI.getConfig();

    // Aggressive check, just to be safe
    if (this.currentModel === 'ollama' && config.modelType === 'ollama') {
      if (!this.currentOllamaModel) {
        // Try to populate models once more if the model is Ollama
        await this.populateOllamaModels();

        if (!this.currentOllamaModel) {
          throw new Error('No Ollama model selected. Please open Settings and select a model.');
        }
      }
    }

    const hub = document.getElementById('welcome-hub');

    if (hub) {
      hub.style.display = 'none';
    }

    const tabId = targetTabId || this.activeTab;
    let chatData;

    if (tabId === 'chat') {
        chatData = this.currentChat;
    }
    else {
        chatData = this.openChats.get(tabId);
    }

    if (!chatData)
      return;

    // Prevent sending if already generating in this tab
    if (chatData.isGenerating)
      return;

    let  input;
    if (tabId === 'chat') {
      input = document.getElementById('chat-input');
    } else {
      input = document.getElementById(`chat-input-${tabId}`);
    }

    const message = text || input.value.trim();

    if (!message)
      return;

    if (!text)
      input.value = '';

    if (chatData.messages.length === 0) {
      const summary = this.generateTabTitle(message);
      chatData.title = summary;

      if (tabId !== 'chat') {
        this.updateTabTitle(tabId, summary);
      }
    }

    // Add user message to correct tab
    chatData.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    if (tabId === 'chat') {
        this.addMessage('user', message);
        this.updateCurrentChat(message, 'user');
    }
    else {
        this.addMessageToTab(tabId, 'user', message);
    }


    this.renderWelcomeHub();

    const loadingId = tabId === 'chat'
        ? this.addMessage('assistant', '<div class="loading"></div> Thinking...')
        : this.addMessageToTab(tabId, 'assistant', '<div class="loading"></div> Thinking...', true);

    const requestId = Date.now() + Math.random().toString(36).substr(2, 9);
    chatData.isGenerating = true;
    chatData.pendingRequestId = requestId;
    this.activeRequests.set(requestId, tabId);

    if (this.workspacePath) {
      try {
        const indexStats = await window.electronAPI.getIndexStats?.().catch(() => ({ count: 0 }));

        if (!indexStats || indexStats.count === 0) {
          console.log('Building workspace index...');
          await window.electronAPI.buildIndex();
          // Sync local cache after building
          await this.syncWorkspaceIndex();
        }
      }
      catch (e) {
        console.warn('Index check/build failed:', e);
      }
    }

    try {
      let responseText;
      let relevantFiles = [];
      const basePrompt = await window.electronAPI.getSystemPrompt();
      let contextPrompt = basePrompt;
      const isTinyLlama = this.currentModel === 'tinyllama';

      if (this.attachedFiles.length > 0) {
        contextPrompt += `\n\nThe user has uploaded ${this.attachedFiles.length} file(s). `;
        contextPrompt += `Relevant sections have been selected based on the question.\n\n`;

        const fileContext = await this.buildSmartContext(this.attachedFiles, message, isTinyLlama);
        contextPrompt += fileContext;
      }
      else if (this.workspacePath) {
        try {
          // Get semantically relevant files
          relevantFiles = await window.electronAPI.searchIndex?.(message, true) || [];

          if (relevantFiles.length === 0 && this.workspaceIndex?.index?.size > 0) {
            console.log('No semantic matches, using workspace file fallback');
            // Get files from the workspace index
            const filesArray = Array.from(this.workspaceIndex.index.values());
            relevantFiles = filesArray.slice(0, 10).map(f => ({
              ...f,
              relevance: 1,
              name: f.relativePath?.split(/[/\\]/).pop() || f.name,
              relativePath: f.relativePath
            }));
          }

          // Extract explicit file mentions from query
          const explicitRefs = this.extractFileReferences(message);

          // Ensure explicitly mentioned files are included even if semantic search missed them
          for (const ref of explicitRefs) {
            const alreadyIncluded = relevantFiles.some(f =>
                f.relativePath?.replace(/\\/g, '/').endsWith(ref.replace(/\\/g, '/')) ||
                f.path?.replace(/\\/g, '/').endsWith(ref.replace(/\\/g, '/')) ||
                f.name === ref.split(/[\/\\]/).pop()
            );

            if (!alreadyIncluded) {
              let explicitFile = this.findFileInWorkspace(ref);

              // FALLBACK: If not in index, try reading directly from disk
              if (!explicitFile && this.workspacePath) {
                try {
                  let testPath = ref;

                  // If not absolute, resolve relative to workspace
                  if (!path.isAbsolute(ref)) {
                    testPath = path.join(this.workspacePath, ref);
                  }

                  // Verify file exists and read it
                  const content = await window.electronAPI.readFile(testPath);
                  const relativePath = path.relative(this.workspacePath, testPath);

                  explicitFile = {
                    name: path.basename(testPath),
                    relativePath: relativePath,
                    absolutePath: testPath,
                    path: testPath,
                    content: content,
                    size: content.length
                  };
                }
                catch (e) {
                  console.log('File not found in index or on disk:', ref);
                  explicitFile = null;
                }
              }

              if (explicitFile) {
                // Load content if not already present (for files found in index but without content)
                if (!explicitFile.content && (explicitFile.absolutePath || explicitFile.path)) {
                  try {
                      const pathToRead = explicitFile.absolutePath || explicitFile.path;
                      explicitFile.content = await window.electronAPI.readFile(pathToRead);
                  }
                  catch (e) {
                      console.warn('Failed to load explicit file reference:', ref, e);
                      continue;
                  }
                }

                // Add with high relevance priority so it's included in context
                relevantFiles.unshift({
                  ...explicitFile,
                  relevance: 9999,
                  isExplicitReference: true
                });
              }
            }
          }

          if (explicitRefs.length > 0) {
            const foundExplicit = relevantFiles.filter(f => f.relevance === 9999 || f.isExplicitReference);
            const missingRefs = explicitRefs.filter(ref =>
              !foundExplicit.some(f =>
                (f.relativePath || '').replace(/\\/g, '/').endsWith(ref.replace(/\\/g, '/')) ||
                f.name === ref.split(/[\/\\]/).pop()
              )
            );

            if (missingRefs.length > 0) {
              contextPrompt += `\n\nNote: The user referenced specific files (${missingRefs.join(', ')}) that could not be found in the workspace index.`;
            }
          }

          // If explicit files were requested but we found nothing, warn in context
          if (explicitRefs.length > 0 && !relevantFiles.some(f => explicitRefs.some(ref =>
            f.relativePath?.endsWith(ref) || f.name === ref
          ))) {
            contextPrompt += `\n\nNote: The user referenced specific files (${explicitRefs.join(', ')}) that could not be found in the workspace index.`;
          }

          // Sort by relevance (explicit refs will be first due to score 9999)
          relevantFiles.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

          // Build context from files (limit to avoid token overflow)
          const filesWithContent = relevantFiles.map(f => {
            let content = f.content;
            if (f.chunks && f.chunks.length > 0) {
              content = f.chunks.map(chunk => `// Lines ${chunk.startLine}-${chunk.endLine}\n${chunk.content}`).join('\n\n');
            }
            return {
              ...f,
              content: content || '',
              absolutePath: f.absolutePath || f.path // Ensure absolutePath exists
            };
          });

          const fileContext = await this.buildSmartContext(filesWithContent, message, isTinyLlama);

          if (fileContext) {
            contextPrompt += `\n\nRelevant workspace files:\n\n${fileContext}`;
          }
          else if (this.workspacePath) {
            // Last resort: at least mention the workspace path
            contextPrompt += `\n\nThe user is working in workspace: ${this.workspacePath}. `;
            contextPrompt += `Answer based on general knowledge if specific files aren't relevant.`;
          }
        }
        catch (e) {
          console.warn('Index search unavailable:', e);
          contextPrompt += `\n\nNote: The user has a workspace open at ${this.workspacePath}, but file search is temporarily unavailable.`;
        }
      }

      const fullPrompt = `<|system|>\n${contextPrompt}</s>\n<|user|>\n${message}</s>\n<|assistant|>\n`;

      if (isTinyLlama && this.tinyLlamaPipeline) {
        const output = await this.tinyLlamaPipeline(fullPrompt, {
          max_new_tokens: 256,
          temperature: 0.3,
          do_sample: true,
          top_k: 128,
          repetition_penalty: 1.1
        });
        const rawOutput = output[0].generated_text;
        const assistantToken = '<|assistant|>';
        const assistantIndex = rawOutput.indexOf(assistantToken);

        if (assistantIndex !== -1) {
          responseText = rawOutput.substring(assistantIndex + assistantToken.length).trim();
        }
        else {
          // Fallback: try to remove fullPrompt, handling potential whitespace variations
          const promptPattern = fullPrompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          responseText = rawOutput.replace(new RegExp(promptPattern, 'i'), '').trim();
        }
        responseText = responseText
          .replace(/<\|system\|>.*?<\/s>/gi, '')
          .replace(/<\|user\|>.*?<\/s>/gi, '')
          .replace(/<\/s>/g, '')
          .trim();
      }
      else if (this.currentModel === 'ollama') {
        const selectedModel = this.currentOllamaModel;
        const result = await window.electronAPI.chatWithOllama(fullPrompt, selectedModel);

        if (result.error)
          throw new Error(result.error);

        responseText = result.response;
      }
      else {
        throw new Error('No model configured');
      }

      if (chatData?.pendingRequestId !== requestId) {
        console.warn('Stale request detected, discarding');
        document.getElementById(loadingId)?.remove();
        return;
      }

      responseText = responseText.replace(/^<\/think>\s*/, '');
      document.getElementById(loadingId)?.remove();

      // Add response to chat data
      chatData.messages.push({
        role: 'assistant',
        content: responseText,
        timestamp: Date.now()
      });
      chatData.isGenerating = false;
      chatData.pendingRequestId = null;

      if (this.activeTab === tabId) {
        if (tabId === 'chat') {
          this.addMessage('assistant', responseText);
          this.updateCurrentChat(responseText, 'assistant');
        }
        else {
          this.addMessageToTab(tabId, 'assistant', responseText);
        }
      }
      else {
        this.setTabUnreadIndicator(tabId, true);
      }

      await this.saveChatToHistory(chatData);
    }
    catch (e) {
      document.getElementById(loadingId)?.remove();

      if (this.openChats.has(tabId)) {
        this.openChats.get(tabId).isGenerating = false;
        this.openChats.get(tabId).pendingRequestId = null;
      }
      if (this.activeTab === tabId) {
        if (tabId === 'chat') {
          this.addMessage('assistant', `Error: ${e.message}`);
        }
        else {
          this.addMessageToTab(tabId, 'assistant', `Error: ${e.message}`);
        }
      }
    }
    finally {
      this.activeRequests.delete(requestId);

      if (loadingId) {
        document.getElementById(loadingId)?.remove();
      }

      if (chatData) {
        chatData.isGenerating = false;
        chatData.pendingRequestId = null;
      }
    }
  }

  handleFileSystemChange({ eventType, relativePath, absolutePath }) {
    if (!this.workspacePath)
      return;

    switch (eventType) {
      case 'add':
      case 'unlink':
      case 'addDir':
      case 'unlinkDir':
        this.pendingChanges.add('structure');
        break;
      case 'change':
        this.pendingChanges.add('change');
        this.pendingChanges.add(relativePath); // Track specific changed files
        break;
    }

    clearTimeout(this.fsChangeTimeout);
    this.fsChangeTimeout = setTimeout(async () => {
      await this.refreshWorkspaceView();
    }, 300);
  }

  async refreshWorkspaceView() {
    const changes = Array.from(this.pendingChanges);

    // Handle structural changes (add/remove directories/files)
    if (changes.includes('structure')) {
      try {
        await this.loadFileTree(this.workspacePath);
        await window.electronAPI.buildIndex();
        // Re-sync index after rebuild
        await this.syncWorkspaceIndex();
      }
      catch(e) {
        console.error(e);
      }
      finally {
        // Only clear structure flag, keep content changes for next cycle
        this.pendingChanges.delete('structure');
      }
    }

    // Handle individual file content changes without full rebuild
    const contentChanges = changes.filter(c => c !== 'structure' && c !== 'change');

    if (contentChanges.length > 0 && !changes.includes('structure')) {
      for (const filePath of contentChanges) {
        await this.updateFileInIndex(filePath);
      }
      this.pendingChanges.delete('change');
      contentChanges.forEach(c => this.pendingChanges.delete(c));
    }
}

  async updateFileInIndex(relativePath) {
    // If file is open in editor, could check for external modifications here
    // For now, just rebuild index (or implement single-file update in main process)
    try {
      await window.electronAPI.updateFileInIndex(relativePath);
    }
    catch (e) {
      console.error('Failed to update file in index:', e);
    }
  }

  async setupTheme() {
    try {
      const savedTheme = await window.electronAPI.getTheme();
      this.applyTheme(savedTheme);
    } catch (e) {}
  }

  applyTheme(theme) {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  async toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');

    this.applyTheme(newTheme);

    await window.electronAPI.setTheme('dark');
  }

  async selectWorkspace() {
    const path = await window.electronAPI.selectWorkspace();

    if (path) {
      this.workspacePath = path;
      await this.loadWorkspace(path);
    }
  }

  async loadWorkspace(path) {
    document.getElementById('workspace-path').textContent = path;
    this.workspacePath = path;
    await window.electronAPI.setConfig({ lastWorkspace: path });
    await this.loadFileTree(path);

    try {
      const metadata = await window.electronAPI.getProjectMetadata();

      if (metadata) {
        this.workspaceIndex.projectMetadata = metadata;
        // Populate local index Map so size checks work correctly
        if (metadata.indexedFiles) {
          this.workspaceIndex.index.clear();

          metadata.indexedFiles.forEach(file => {
            this.workspaceIndex.index.set(file.path, file);
          });
          console.log(`Indexed ${this.workspaceIndex.index.size} files. Detected: ${metadata.type} project`);
        }
      }
    }
    catch (e) {
      console.error('Failed to build/load index:', e);
    }

    await this.initBuildSystem();
  }

  async loadFileTree(dirPath, parentElement = null) {
    const container = parentElement || document.getElementById('file-tree');

    if (!parentElement)
      container.innerHTML = '';

    try {
      const items = await window.electronAPI.getFileTree(dirPath);

      for (const item of items) {
        const div = document.createElement('div');
        div.className = `file-item ${item.isDirectory ? 'directory' : ''}`;
        div.style.paddingLeft = parentElement ? '2rem' : '0.5rem';

        div.dataset.path = item.path;

        // Restore active class if this is the active file
        if (item.path === this.activeFilePath) {
          div.classList.add('active-file');
        }

        const icon = item.isDirectory ? '📁' : this.getFileIcon(item.extension);
        div.innerHTML = `<span class="file-icon">${icon}</span>${item.name}`;

        div.addEventListener('click', async (e) => {
          e.stopPropagation();

          if (item.isDirectory) {
            const existing = div.nextElementSibling;

            if (existing?.classList.contains('dir-children')) {
              existing.remove();
            }
            else {
              const childrenContainer = document.createElement('div');
              childrenContainer.className = 'dir-children';
              div.after(childrenContainer);

              await this.loadFileTree(item.path, childrenContainer);

              if (this.activeFilePath) {
                const activeEl = document.querySelector(`[data-path="${CSS.escape(this.activeFilePath)}"]`);

                if (activeEl)
                  activeEl.classList.add('active-file');
              }
            }
          }
          else {
            this.openFile(item.path, item.name);
          }
        });
        container.appendChild(div);
      }
    } catch (e) {
      console.error('Error loading file tree:', e);
    }

    this.renderWelcomeHub();
  }

  getFileIcon(ext) {
    const icons = { '.js': '📄', '.ts': '📘', '.html': '🌐', '.css': '🎨', '.json': '📋', '.md': '📝', '.py': '🐍' };
    return icons[ext] || '📄';
  }

  setActiveFile(filePath) {
    if (this.activeFilePath) {
      const prevEl = document.querySelector(`[data-path="${CSS.escape(this.activeFilePath)}"]`);

      if (prevEl)
        prevEl.classList.remove('active-file');
    }

    this.activeFilePath = filePath;

    if (filePath) {
      // Add active class to new file
      const currEl = document.querySelector(`[data-path="${CSS.escape(filePath)}"]`);

      if (currEl)
        currEl.classList.add('active-file');

      // Persist to settings.json
      window.electronAPI.setConfig({ activeFile: filePath });
    }
    else {
      // Clear from settings when closing
      window.electronAPI.setConfig({ activeFile: null });
    }
  }

  async openFile(filePath, fileName, viewState = null, setActive = true) {
    for (const [tabId, file] of this.openFiles.entries()) {
      if (file.path === filePath) {
        if (setActive) {
          this.switchToTab(tabId);
        }
        if (viewState && file.editor) {
          file.editor.restoreViewState(viewState);
        }
        return;
      }
    }

    if (setActive) {
      this.setActiveFile(filePath);
    }

    try {
      const content = await window.electronAPI.readFile(filePath);
      this.createTab(filePath, fileName, content, viewState, setActive);
    }
    catch (e) {
      alert('Error opening file: ' + e.message);
    }
  }

  async saveEditorState() {
    const openFilesData = [];
    for (const [tabId, file] of this.openFiles) {
      openFilesData.push({
        type: 'file',
        tabId, path:
        file.path,
        name: file.name
      });
    }

    const openChatsData = [];
    for (const [tabId, chat] of this.openChats) {
      openChatsData.push({
        type: 'chat',
        tabId,
        chatId: chat.id,
        title: chat.title,
        messages: chat.messages
      });
    }

    await window.electronAPI.setConfig({
      openFiles: openFilesData,
      openChats: openChatsData,
      activeTab: this.activeTab,
      lastActiveChatTab: this.lastActiveChatTab
    });
  }

  debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  async restoreEditorState() {
    const config = await window.electronAPI.getConfig();

    if (!config.openFiles || config.openFiles.length === 0)
      return;

    // Restore chat tabs
    if (config.openChats && config.openChats.length > 0) {
      for (const chatConfig of config.openChats) {
        if (chatConfig.type === 'chat') {
          this.createChatTab({
            id: chatConfig.chatId,
            title: chatConfig.title,
            messages: chatConfig.messages || []
          });
        }
      }
    }
    else {
      // Create default chat if none restored
      this.createChatTab();
    }

    // Restore active tab
    if (config.activeTab && (
      this.openChats.has(config.activeTab) ||
      this.openFiles.has(config.activeTab) ||
      config.activeTab === 'chat'
    )) {
      this.switchToTab(config.activeTab);
    }
    else if (config.lastActiveChatTab && this.openChats.has(config.lastActiveChatTab)) {
      this.switchToTab(config.lastActiveChatTab);
    }

    // Open all files without switching, except the active one
    for (let i = 0; i < config.openFiles.length; i++) {
      const fileData = config.openFiles[i];
      const isActiveFile = fileData.path === config.activeFile;

      try {
        await this.openFile(
          fileData.path,
          fileData.name,
          fileData.viewState,
          isActiveFile // Only switch to tab for the active file
        );
      } catch (e) {
        console.error('Failed to restore file:', fileData.path, e);
      }
    }
  }

  createTab(filePath, fileName, content, viewState = null, switchToTab = true) {
    const tabs = document.getElementById('tabs');
    const tabId = 'tab-' + Date.now();
    const tab = document.createElement('div');

    tab.className = 'tab';
    tab.dataset.tab = tabId;
    tab.innerHTML = `<span>${fileName}</span><span class="tab-close" onclick="app.closeTab('${tabId}', event)">×</span>`;

    tab.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close'))
        this.switchToTab(tabId);
    });
    tabs.appendChild(tab);

    const editorDiv = document.createElement('div');

    editorDiv.id = tabId;
    editorDiv.className = 'tab-panel editor-container';
    editorDiv.innerHTML = `<div class="monaco-editor-container" id="editor-${tabId}"></div>`;
    document.querySelector('.tab-contents').appendChild(editorDiv);

    this.openFiles.set(tabId, { path: filePath, name: fileName, content, modified: false });
    this.switchToTab(tabId);

    setTimeout(() => {
      const instance = monaco.editor.create(document.getElementById(`editor-${tabId}`), {
        value: content,
        language: this.getLanguageFromExt(filePath.match(/\.[^.]+$/)?.[0] || ''),
        theme:  'vs-dark',
        automaticLayout: true
      });
      this.openFiles.get(tabId).editor = instance;

      if (viewState) {
        instance.restoreViewState(viewState);
      }

      // Auto-save view state on scroll/cursor change
      instance.onDidScrollChange(() => this.debouncedSaveEditorState());
      instance.onDidChangeCursorPosition(() => this.debouncedSaveEditorState());
    }, 0);
  }

  setupTabDragHandlers(tab, tabId, type) {
    tab.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', tabId);
        e.dataTransfer.effectAllowed = 'move';
        tab.classList.add('dragging');
        this.draggedTab = tabId;
    });

    tab.addEventListener('dragend', () => {
        tab.classList.remove('dragging');
        this.draggedTab = null;
    });

    tab.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    tab.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!this.draggedTab || this.draggedTab === tabId) return;

        // Get the tabs container
        const tabsContainer = document.getElementById('tabs');
        const draggedEl = document.querySelector(`[data-tab="${this.draggedTab}"]`);
        const targetEl = document.querySelector(`[data-tab="${tabId}"]`);

        if (draggedEl && targetEl) {
            // Insert dragged tab before target tab
            tabsContainer.insertBefore(draggedEl, targetEl);
        }
    });
  }

  createChatTab(existingChat = null) {
    const tabId = `chat-${Date.now()}-${this.chatTabCounter++}`;
    const chatId = existingChat?.id || null;

    // Create tab data
    const chatData = {
      tabId,
      id: chatId,
      title: existingChat?.title || 'New Chat',
      messages: existingChat?.messages || [],
      isGenerating: false,
      pendingRequestId: null
    };

    this.openChats.set(tabId, chatData);

    // Create DOM tab (insert before file tabs, after existing chat tabs)
    const tabsContainer = document.getElementById('tabs');
    const tab = document.createElement('div');
    tab.className = 'tab chat-tab';
    tab.dataset.tab = tabId;
    tab.draggable = true; // Enable dragging

    tab.innerHTML = `
      <span class="chat-tab-title">${this.escapeHtml(chatData.title)}</span>
      <span class="tab-close" onclick="app.closeChatTab('${tabId}', event)">×</span>
    `;

    // Insert into chat section (before Monaco tabs)
    const firstFileTab = Array.from(tabsContainer.children).find(t =>
      t.dataset.tab && t.dataset.tab.startsWith('tab-')
    );
    if (firstFileTab) {
      tabsContainer.insertBefore(tab, firstFileTab);
    }
    else {
      tabsContainer.appendChild(tab);
    }

    const newChatBtn = document.getElementById('btn-new-chat-tab');
    if (newChatBtn) {
        tab.after(newChatBtn);
    }

    // Event listeners
    tab.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        this.switchToTab(tabId);
      }
    });

    // Drag handlers
    this.setupTabDragHandlers(tab, tabId, 'chat');

    // Create panel (hidden initially)
    this.createChatPanel(tabId);

    this.switchToTab(tabId);
    return tabId;
  }

  async closeChatTab(tabId, event) {
    if (event) event.stopPropagation();

    const tabElement = document.querySelector(`[data-tab="${tabId}"]`);
    const chatData = this.openChats.get(tabId);

    if (!chatData)
      return;

    let nextTabId = null;
    if (this.activeTab === tabId) {
      let prev = tabElement?.previousElementSibling;

      while (prev && !prev.dataset.tab) { // Skip non-tab elements
        prev = prev.previousElementSibling;
      }

      if (prev?.dataset.tab) {
        nextTabId = prev.dataset.tab;
      }
      else {
        // Try next sibling
        let next = tabElement?.nextElementSibling;

        while (next && !next.dataset.tab) {
            next = next.nextElementSibling;
        }

        if (next?.dataset.tab)
          nextTabId = next.dataset.tab;
      }
    }

    // Save before closing
    if (chatData.messages.length > 0) {
      await this.saveChatToHistory(chatData);
    }

    // If generating, cancel
    if (chatData.isGenerating && chatData.pendingRequestId) {
      // TODO: implement cancellation logic
    }

    // Remove DOM
    tabElement?.remove();
    document.getElementById(tabId)?.remove();


    const tabsContainer = document.getElementById('tabs');

    // Reposition + button to after last remaining chat tab
    const newChatBtn = document.getElementById('btn-new-chat-tab');
    if (newChatBtn) {
        const chatTabs = Array.from(tabsContainer.children).filter(t =>
            t.classList.contains('chat-tab')
        );

        if (chatTabs.length > 0) {
            chatTabs[chatTabs.length - 1].after(newChatBtn);
        }
        else {
            // No chat tabs left - move to beginning before file tabs
            const firstFileTab = Array.from(tabsContainer.children).find(t =>
              t.dataset.tab?.startsWith('tab-')
            );
            if (firstFileTab) {
                tabsContainer.insertBefore(newChatBtn, firstFileTab);
            }
            else {
                tabsContainer.appendChild(newChatBtn);
            }
        }
    }

    // Remove from state
    this.openChats.delete(tabId);

    // Switch to another tab
    if (nextTabId) {
        this.switchToTab(nextTabId);
    }
    else if (this.openChats.size > 0) {
        this.switchToTab(this.openChats.keys().next().value);
    }
    else {
        this.switchToTab('chat');
        this.createChatTab();
    }

    await this.saveEditorState();
  }

  generateTabTitle(firstMessage) {
    // Remove emojis and special characters, limit to 25 chars
    const clean = firstMessage
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[^\w\s\-]/g, '') // Remove special chars except spaces/hyphens
      .trim()
      .substring(0, 25);

    return clean || 'New Chat';
  }

  _renderWelcomeHubContent(tabId) {
    const title = document.getElementById(`hub-title-${tabId}`);
    const subtitle = document.getElementById(`hub-subtitle-${tabId}`);
    const suggestions = document.getElementById(`hub-suggestions-${tabId}`);

    if (!title || !subtitle || !suggestions)
      return;

    if (!this.workspacePath) {
      if (this.currentModel === 'tinyllama') {
        title.textContent = 'Ready to collaborate';
        subtitle.textContent = 'TinyLlama runs entirely on your machine - no setup needed. Open a workspace folder to analyze your code, or ask to generate a new project';
        suggestions.innerHTML = `
          <button class="hub-suggestion-btn" onclick="app.selectWorkspace()">
            <div class="suggestion-icon">📂</div>
            <div class="suggestion-content">
              <div class="suggestion-title">Open workspace folder</div>
              <div class="suggestion-desc">Browse and analyze your local code repository</div>
            </div>
          </button>
          <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Help me understand how to use this app')">
            <div class="suggestion-icon">💡</div>
            <div class="suggestion-content">
              <div class="suggestion-title">How does this work?</div>
              <div class="suggestion-desc">Learn about features and keyboard shortcuts</div>
            </div>
          </button>
        `;
      }
      else {
        title.textContent = 'Ready to collaborate';
        subtitle.textContent = 'Ollama lets you use open-source models (such as Mistral, Kimi, Deepseek, etc) either locally or via cloud. This requires Ollama installation';
        suggestions.innerHTML = `
          <button class="hub-suggestion-btn" onclick="app.selectWorkspace()">
            <span>📂</span> Open workspace folder
          </button>
          <button class="hub-suggestion-btn" onclick="window.open('https://ollama.com', '_blank')">
            <span>🔗</span> Get Ollama app
          </button>
          <button class="hub-suggestion-btn" onclick="app.showSettingsModal()">
            <span>⚙️</span> Choose model
          </button>
        `;
      }
    }
    else {
      title.textContent = 'Ready to collaborate';
      subtitle.textContent = 'What shall we work on?';

      if (this.currentModel === 'tinyllama') {
        suggestions.innerHTML = `
          <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Explain what this project does')">
            <div class="suggestion-icon">🔍</div>
            <div class="suggestion-content">
              <div class="suggestion-title">Explain the codebase</div>
              <div class="suggestion-desc">Get an overview of the project structure and purpose</div>
            </div>
          </button>
          <button class="hub-suggestion-btn" onclick="app.sendSuggestion('How do I run this project?')">
            <div class="suggestion-icon">🚀</div>
            <div class="suggestion-content">
              <div class="suggestion-title">Getting started</div>
              <div class="suggestion-desc">Find setup instructions and dependencies</div>
            </div>
          </button>
          <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Find potential bugs')">
            <div class="suggestion-icon">🐛</div>
            <div class="suggestion-content">
              <div class="suggestion-title">Check for issues</div>
              <div class="suggestion-desc">Scan for common bugs and code smells</div>
            </div>
          </button>
        `;
      }
      else {
        suggestions.innerHTML = `
        <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Review the architecture')">
          <div class="suggestion-icon">🏗️</div>
          <div class="suggestion-content">
            <div class="suggestion-title">Architecture review</div>
            <div class="suggestion-desc">Analyze design patterns and structure</div>
          </div>
        </button>
        <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Optimize for performance')">
          <div class="suggestion-icon">⚡</div>
          <div class="suggestion-content">
            <div class="suggestion-title">Optimize code</div>
            <div class="suggestion-desc">Identify bottlenecks and improve efficiency</div>
          </div>
        </button>
        <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Security audit')">
          <div class="suggestion-icon">🔒</div>
          <div class="suggestion-content">
            <div class="suggestion-title">Security check</div>
            <div class="suggestion-desc">Scan for vulnerabilities and best practices</div>
          </div>
        </button>
        <button class="hub-suggestion-btn" onclick="app.sendSuggestion('Generate documentation')">
          <div class="suggestion-icon">📝</div>
          <div class="suggestion-content">
            <div class="suggestion-title">Document code</div>
            <div class="suggestion-desc">Create README and inline documentation</div>
          </div>
        </button>
      `;
      }
    }
  }

  createChatPanel(tabId) {
    const container = document.querySelector('.tab-contents');
    const mainPanel = document.getElementById('chat-panel');

    if (!mainPanel) {
      console.error('Main chat panel not found');
      return;
    }

    const panel = mainPanel.cloneNode(true);
    panel.id = tabId;
    panel.classList.remove('active'); // Don't activate immediately

    // Update all IDs to be unique for this tab, preserving the structure
    const elementsWithId = panel.querySelectorAll('[id]');
    elementsWithId.forEach(el => {
      el.id = `${el.id}-${tabId}`;
    });

    container.appendChild(panel);

    // Get references using the new IDs
    const input = document.getElementById(`chat-input-${tabId}`);
    const sendBtn = document.getElementById(`btn-send-${tabId}`);
    const insertFileBtn = document.getElementById(`insert-file-${tabId}`);
    const hideHubBtn = document.getElementById(`btn-hide-hub-${tabId}`);
    const welcomeHub = document.getElementById(`welcome-hub-${tabId}`);

    // Wire up event listeners (identical behavior to main chat)
    input?.addEventListener('input', (e) => {
      const textarea = e.target;
      const minHeight = 60;
      const maxHeight = 320;
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
      const threshold = lineHeight * 2;

      textarea.style.height = 'auto';
      if (textarea.value.trim().length === 0) {
        textarea.style.height = minHeight + 'px';
        return;
      }
      const scrollHeight = textarea.scrollHeight;
      if (scrollHeight > minHeight + threshold) {
        textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
      }
      else {
        textarea.style.height = minHeight + 'px';
      }
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(null, tabId);
      }
    });

    sendBtn.addEventListener('click', () => this.sendMessage(null, tabId));
    insertFileBtn.addEventListener('click', () => this.selectFiles());
    hideHubBtn?.addEventListener('click', () => {
      welcomeHub?.classList.add('hidden');
    });

    // Populate welcome hub content
    this._renderWelcomeHubContent(tabId);

    // Clear any messages that were cloned from main chat
    const messagesContainer = document.getElementById(`chat-messages-${tabId}`);

    if (messagesContainer)
      messagesContainer.innerHTML = '';

    if (input) {
      input.value = ''; // Clear cloned input text
      input.style.height = '60px'; // Reset height
    }

    // Ensure welcome hub is visible for new empty tabs
    if (welcomeHub) {
      welcomeHub.style.display = 'block';
    }

    // Reset scroll position
    if (messagesContainer) {
      messagesContainer.scrollTop = 0;
    }

    // Restore messages for this tab if they exist
    const chatData = this.openChats.get(tabId);
    if (chatData?.messages?.length > 0) {
      chatData.messages.forEach(msg => {
        this.addMessageToTab(tabId, msg.role, msg.content);
      });
    }
  }

  updateTabTitle(tabId, title) {
    const tab = document.querySelector(`[data-tab="${tabId}"]`);
    if (tab) {
      const titleSpan = tab.querySelector('.chat-tab-title');
      if (titleSpan) titleSpan.textContent = title;
    }
    // Update data model
    if (this.openChats.has(tabId)) {
      this.openChats.get(tabId).title = title;
    }
  }

  getLanguageFromExt(ext) {
    const map = { '.js': 'javascript', '.ts': 'typescript', '.html': 'html', '.css': 'css', '.py': 'python', '.json': 'json', '.md': 'markdown' };
    return map[ext] || 'plaintext';
  }

  switchToTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    // Clear unread indicator
    this.setTabUnreadIndicator(tabId, false);

    this.activeTab = tabId;
    this.lastActiveChatTab = tabId;
    this.saveEditorState(); // Persist active tab

    if (tabId === 'chat') {
      document.querySelector('[data-tab="chat"]')?.classList.add('active');
      document.getElementById('chat-panel')?.classList.add('active');
    }
    else {
      document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
      document.getElementById(tabId)?.classList.add('active');

      const file = this.openFiles.get(tabId);

      if (file && file.path !== this.activeFilePath)
        this.setActiveFile(file.path);
    }
    this.activeTab = tabId;
  }

  async closeTab(tabId, event) {
    if (event)
      event.stopPropagation();

    const tabElement = document.querySelector(`[data-tab="${tabId}"]`);
    const file = this.openFiles.get(tabId);

    let nextTabId = null;
    if (this.activeTab === tabId) {
      // Try previous sibling (skip the new-chat button if present)
      let prev = tabElement?.previousElementSibling;

      while (prev && (!prev.dataset.tab || prev.id === 'btn-new-chat-tab')) {
        prev = prev.previousElementSibling;
      }

      if (prev?.dataset.tab) {
        nextTabId = prev.dataset.tab;
      }
      else {
        // No previous, try next sibling
        let next = tabElement?.nextElementSibling;

        while (next && (!next.dataset.tab || next.id === 'btn-new-chat-tab')) {
          next = next.nextElementSibling;
        }

        if (next?.dataset.tab)
          nextTabId = next.dataset.tab;
      }
    }

    if (file?.path === this.activeFilePath)
      this.setActiveFile(null);

    if (file?.modified && confirm('Save changes?'))
      await this.saveCurrentFile(tabId);

    await this.saveEditorState();

    tabElement?.remove();
    document.getElementById(tabId)?.remove();
    this.openFiles.delete(tabId);

    if (nextTabId) {
        this.switchToTab(nextTabId);
    }
    else if (this.openFiles.size === 0) {
        this.switchToTab('chat');
        this.setActiveFile(null);
    }

    await this.saveEditorState();
  }

  async saveCurrentFile(tabId = this.activeTab) {
    const file = this.openFiles.get(tabId);

    if (!file?.modified)
      return;

    try {
      const content = file.editor.getValue();
      await window.electronAPI.writeFile(file.path, content);
      file.modified = false;
    }
    catch (e) {
      alert('Error saving: ' + e.message);
    }
  }

  addMessage(role, content) {
    const container = document.getElementById('chat-messages');
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');

    div.id = id;
    div.className = `message ${role}`;

    const bubble = document.createElement('div');

    bubble.className = 'message-bubble';

    const isLoading = /<div\s+class="loading"/.test(content);
    const parsed = isLoading ? content : this.parseMarkdown(content);

    bubble.innerHTML = parsed;
    div.appendChild(bubble);
    container.appendChild(div);

    // Apply syntax highlighting to new code blocks
    if (typeof hljs !== 'undefined') {
      bubble.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }

    container.scrollTop = container.scrollHeight;
    return id;
  }

  parseMarkdown(text) {
    if (!text)
      return '';

    // Extract code blocks first to protect them from newline replacement
    const codeBlocks = [];
    let processedText = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
          const language = lang || 'text';
          const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
          codeBlocks.push(`<pre><code class="language-${language}">${code.trim()}</code></pre>`);
          return placeholder;
      })
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/((?:^\d+\.\s+.+$\n?)+)/gm, (match) => {
          const items = match.trim().split('\n').map(line => {
              const content = line.replace(/^\d+\.\s+/, '');
              return `<li>${content}</li>`;
          }).join('');
          return `<ol>${items}</ol>`;
      })
      .replace(/((?:^[-*]\s+.+$\n?)+)/gm, (match) => {
          const items = match.trim().split('\n').map(line => {
              const content = line.replace(/^[-*]\s+/, '');
              return `<li>${content}</li>`;
          }).join('');
          return `<ul>${items}</ul>`;
      })
      .replace(/\n/g, '<br>');

    // Restore code blocks (with their original newlines preserved)
    codeBlocks.forEach((block, index) => {
        processedText = processedText.replace(`__CODE_BLOCK_${index}__`, block);
    });

    return processedText;
  }

  async rebuildIndex() {
    if (!this.workspacePath)
      return;

    try {
      const count = await window.electronAPI.buildIndex();

      await this.syncWorkspaceIndex(); // Sync after rebuild
      this.updateStatus(`Workspace indexed: ${count} files`);
    }
    catch (e) {
      console.error('Rebuild failed:', e);
      this.updateStatus('Index rebuild failed');
    }
  }

  async syncWorkspaceIndex() {
    try {
      const metadata = await window.electronAPI.getProjectMetadata();

      if (metadata) {
        this.workspaceIndex.projectMetadata = metadata;
        this.workspaceIndex.index.clear();

        if (metadata.indexedFiles) {
          metadata.indexedFiles.forEach(file => {
            this.workspaceIndex.index.set(file.path, file);
          });
        }
      }
    }
    catch (e) {
      console.error('Failed to sync workspace index:', e);
    }
  }

  updateStatus(text) {
    document.getElementById('status-text').textContent = text;
  }

  chunkFileContent(content, chunkSize = 1500, overlap = 200) {
    const chunks = [];
    const lines = content.split('\n');
    let currentChunk = [];
    let currentLength = 0;
    let lineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      currentChunk.push(lines[i]);
      currentLength += lines[i].length + 1;
      lineNumber = i + 1;

      if (currentLength >= chunkSize) {
        chunks.push({
          content: currentChunk.join('\n'),
          endLine: lineNumber,
          startLine: lineNumber - currentChunk.length + 1
        });

        // Keep overlap lines for next chunk
        currentChunk = currentChunk.slice(-Math.floor(overlap / 50));
        currentLength = currentChunk.join('\n').length;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join('\n'),
        startLine: lineNumber - currentChunk.length + 1,
        endLine: lineNumber
      });
    }

    return chunks;
  }

  scoreChunkRelevance(chunks, query) {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(w => w.length > 2);

    // Extract potential function/variable names from query
    const codeRefs = query.match(/\b([a-zA-Z_]\w+)\b/g) || [];

    return chunks.map(chunk => {
      const chunkLower = chunk.content.toLowerCase();
      let score = 0;

      // Exact phrase matching
      if (chunkLower.includes(queryLower))
        score += 10;

      // Term frequency
      queryTerms.forEach(term => {
        const matches = (chunkLower.match(new RegExp(term, 'g')) || []).length;
        score += matches * 2;
      });

      // Code reference matching (function names, etc.)
      codeRefs.forEach(ref => {
        // Definition bonus
        const defPatterns = [
          new RegExp(`function\\s+${ref}\\b`, 'i'),
          new RegExp(`def\\s+${ref}\\b`, 'i'),
          new RegExp(`const\\s+${ref}\\s*=`, 'i'),
          new RegExp(`${ref}\\s*[:=]\\s*(function|=>)`, 'i')
        ];

        if (defPatterns.some(p => p.test(chunk.content)))
          score += 15;

        // Usage bonus
        if (chunkLower.includes(ref.toLowerCase()))
          score += 3;
      });

      return { ...chunk, score };
    }).sort((a, b) => b.score - a.score);
  }

  // Extract potential file references from text (e.g., "utils.js", "src/main.py")
  extractFileReferences(text) {
    const pattern = /(?:[\w\-]+\/)*[\w\-]+\.(js|ts|jsx|tsx|py|java|cpp|c|h|hpp|cs|go|rs|rb|php|swift|kt|scala|r|css|scss|html|json|xml|yaml|yml|md|txt|sql|vue|svelte)\b/gi;

    const refs = new Set();
    let match;

    while ((match = pattern.exec(text)) !== null) {
      let ref = match[0].trim();
      // Remove trailing punctuation and quotes
      ref = ref.replace(/[.,;:!?'"`]+$/, '');
      // Remove leading ./
      ref = ref.replace(/^\.\//, '');
      if (ref) refs.add(ref);
    }

    return Array.from(refs);
  }

  // Find file in workspace index by reference
  findFileInWorkspace(fileRef) {
    if (!this.workspaceIndex?.index || this.workspaceIndex.index.size === 0) {
        return null;
      }

      // Normalize the reference
      const normalizedRef = fileRef.replace(/\\/g, '/').replace(/^\.\//, '');
      const refBasename = normalizedRef.split('/').pop();

      for (const [relativePath, file] of this.workspaceIndex.index) {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const pathBasename = normalizedPath.split('/').pop();

        // Match if path ends with reference or basename matches
        if (normalizedPath.endsWith(normalizedRef) ||
          pathBasename === refBasename ||
          pathBasename === normalizedRef) {

          // Ensure we have an absolute path
          const absolutePath = file.absolutePath ||
            path.join(this.workspacePath, relativePath);

          return {
            ...file,
            name: pathBasename,
            relativePath: relativePath,
            absolutePath: absolutePath,
            path: absolutePath
        };
      }
    }

    return null;
  }

  isProjectOverviewQuery(query) {
    const patterns = [
      /what\s+(?:is|does)\s+(?:this|the)\s+project/i,
      /explain\s+(?:this|the)\s+(?:project|codebase|app)/i,
      /what\s+is\s+this/i,
      /tell\s+me\s+about\s+this/i,
      /project\s+(?:overview|summary|description)/i,
      /what\s+language/i,
      /what\s+framework/i,
      /how\s+is\s+this\s+built/i
    ];
    return patterns.some(p => p.test(query.toLowerCase()));
  }

  async buildSmartContext(files, query, isTinyLlama = true) {
    const isOverview = this.isProjectOverviewQuery(query);
    const maxChars = isTinyLlama ? 1250 : 50000;
    const processedPaths = new Set();

    let context = '';
    let usedChars = 0;

    for (const file of files) {
      if (usedChars >= maxChars) break;

      const filePath = file.relativePath || file.path;
      if (processedPaths.has(filePath)) continue;

      let content = file.content;

      if (!content && (file.absolutePath || file.path)) {
        try {
          // Prefer absolutePath over path (path might be relative)
          const pathToRead = file.absolutePath || file.path;
          content = await window.electronAPI.readFile(pathToRead);
        }
        catch (e) {
          console.warn('Failed to read file in buildSmartContext:', filePath, e);
          continue;
        }
      }

      if (!content)
        continue;

      // Treat explicit references or high-relevance files like overviews
      // to include more content when user specifically asks about them
      const isExplicitReference = file.relevance > 9000 || file.isExplicitReference;

      if (isOverview || isExplicitReference || content.length < 8000) {
        // For explicit references, be more generous with truncation
        const limit = isExplicitReference ? 12000 : 8000;
        const truncated = content.length > limit
          ? content.substring(0, limit) + '\n... [truncated]'
          : content;

        context += `File: ${file.relativePath || file.name}\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
        usedChars += truncated.length;
        processedPaths.add(filePath);
        continue;
      }

      // For larger files with specific query, chunk and score
      const chunks = this.chunkFileContent(content);
      const scoredChunks = this.scoreChunkRelevance(chunks, query);

      const hasHighScores = scoredChunks.some(c => c.score > 0);
      const chunksToInclude = hasHighScores
        ? scoredChunks.filter(c => c.score > 0).slice(0, 15)
        : scoredChunks.slice(0, 3); // Include first 3 chunks if no matches

      let fileContext = '';
      let fileChars = 0;

      for (const chunk of chunksToInclude) {
        if (usedChars + fileChars + chunk.content.length > maxChars)
          break;

        fileContext += `// Lines ${chunk.startLine}-${chunk.endLine}\n${chunk.content}\n\n`;
        fileChars += chunk.content.length + 50;
      }

      if (fileContext) {
        context += `File: ${file.relativePath || file.name}\n\`\`\`\n${fileContext}\n\`\`\`\n\n`;
        usedChars += fileChars;
        processedPaths.add(filePath);
      }
    }

    if (!context && files.length > 0) {
      context = `Workspace contains ${files.length} relevant files including: ${files.slice(0, 5).map(f => f.relativePath || f.name).join(', ')}.`;
    }

    return context;
  }

  extractEntryPointOverview(content) {
    // Extract imports and first class/function for quick understanding
    const lines = content.split('\n');
    const imports = [];
    const definitions = [];
    let inImports = true;

    for (const line of lines) {
      if (inImports && (line.startsWith('import') || line.startsWith('from') || line.startsWith('const') || line.startsWith('require'))) {
        imports.push(line);
      } else {
        inImports = false;
      }

      if (line.match(/^(class|function|def|const|async function|export)/)) {
        definitions.push(line);
        if (definitions.length >= 3) break; // First few definitions only
      }
    }

    return [...imports.slice(0, 10), '', ...definitions.slice(0, 5)].join('\n');
  }

  initMonaco() {
    if (typeof require === 'undefined')
      return;

    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});
    require(['vs/editor/editor.main'], () => {});
  }

  showSettingsModal() {
    const currentModelDiv = document.getElementById('current-model');

    if (this.currentModel === 'tinyllama')
      if (currentModelDiv)
        currentModelDiv.style.display = "none";

    if (this.currentModel !== 'tinyllama')
      this.populateOllamaModels();

    const modelRadio = document.querySelector(`input[name="settings-model"][value="${this.currentModel}"]`);
    if (modelRadio) {
      modelRadio.checked = true;
    }

    // Grab user's theme so we can restore it on cancel
    this._originalTheme = document.documentElement.getAttribute('data-theme') || 'system';

    // Set current theme selection
    const themeRadio = document.querySelector(`input[name="theme-setting"][value="${this.config.theme || 'system'}"]`);

    document.querySelectorAll('input[name="theme-setting"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.previewTheme(e.target.value);
        }
      });
    });

    if (themeRadio)
      themeRadio.checked = true;

    const showHubCheckbox = document.getElementById('setting-show-hub');

    if (showHubCheckbox) {
        showHubCheckbox.checked = this.showWelcomeHub;
    }

    // Show modal
    document.getElementById('settings-modal')?.classList.remove('hidden');
  }

  closeSettingsModal() {
    document.getElementById('settings-modal')?.classList.add('hidden');

    if (this._originalTheme) {
      this.applyTheme(this._originalTheme);
      this._originalTheme = null;
    }
  }

  async saveSettings() {
    try {
        // Handle model change if selected
        const selectedModel = document.querySelector('input[name="settings-model"]:checked')?.value;

        if (selectedModel && selectedModel !== this.currentModel) {
          // Confirm if user wants to switch (may require download)
          let message = `Switch to ${selectedModel === 'tinyllama' ? 'TinyLlama' : 'Ollama'}? `;

          if (selectedModel === 'tinyllama')
            message += "This may require downloading files if Tinyllama is not installed";

          if (confirm(message))
              await this.selectModel(selectedModel);

          else
            return;
        }

        // Handle theme change
        const selectedTheme = document.querySelector('input[name="theme-setting"]:checked')?.value;
        if (selectedTheme) {
            this.applyTheme(selectedTheme);
            await window.electronAPI.setTheme(selectedTheme);
            this.config.theme = selectedTheme;
        }

        this.closeSettingsModal();

        const showHub = document.getElementById('setting-show-hub')?.checked;

        if (showHub !== undefined && showHub !== this.showWelcomeHub) {
            await this.toggleWelcomeHub(showHub);
            // Update toggle button if exists
            const toggleBtn = document.getElementById('hub-toggle');

            if (toggleBtn) {
                toggleBtn.textContent = showHub ? 'Tips: On' : 'Tips: Off';
                toggleBtn.classList.toggle('active', showHub);
            }
        }
    } catch (e) {
        console.error('Failed to save settings:', e);
        alert('Error saving settings: ' + e.message);
    }
  }

  // Optional: Quick theme toggle from settings without saving
  previewTheme(theme) {
      this.applyTheme(theme);
  }

  async selectFiles() {
    try {
      const files = await window.electronAPI.selectFiles();

      if (files.length > 0) {
        // Load full content for analysis
        const filesWithContent = await Promise.all(
          files.map(async (file) => {
            try {
              // Load entire file content
              const fullContent = await window.electronAPI.readFile(file.path);
              return {
                ...file,
                content: fullContent,
                contentPreview: fullContent.substring(0, 200) // Keep preview for UI
              };
            } catch (e) {
              console.error('Failed to load file:', e);
              return file;
            }
          })
        );

        this.attachedFiles = [...this.attachedFiles, ...filesWithContent];
        this.renderAttachedFiles();
      }
    }
    catch (e) {
      console.error('File selection failed:', e);
    }
  }

  renderAttachedFiles() {
    // Determine target elements based on active tab
    const isClonedTab = this.activeTab !== 'chat';
    const chatInputId = isClonedTab ? `chat-input-${this.activeTab}` : 'chat-input';
    const containerId = isClonedTab ? `attached-files-container-${this.activeTab}` : 'attached-files-container';

    let container = document.getElementById(containerId);
    const chatInput = document.getElementById(chatInputId);

    if (!chatInput) return; // Safety check

    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; border-bottom: 1px solid var(--border-color);';
      chatInput.parentNode.insertBefore(container, chatInput);
    }

    container.innerHTML = '';
    this.attachedFiles.forEach((file, index) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.style.cssText = 'display: flex; align-items: center; gap: 6px; background: var(--accent-color); color: white; padding: 4px 12px; border-radius: 16px; font-size: 0.85em;';
      chip.innerHTML = `
        <span>${file.name}</span>
        <button onclick="app.removeAttachedFile(${index})" style="background: none; border: none; color: white; cursor: pointer; font-weight: bold;">×</button>
      `;
      container.appendChild(chip);
    });
}

  removeAttachedFile(index) {
    this.attachedFiles.splice(index, 1);
    this.renderAttachedFiles();
  }

  ///////////////////////////////////////////////////////////////////////////////////////
  async loadCurrentChatFromJson() {
    try {
      const result = await window.electronAPI.loadCurrentChatJson();
      if (result.success && result.chat) {
        this.currentChat = result.chat;
        // Restore messages to UI
        if (this.currentChat.messages.length > 0) {
          document.getElementById('chat-messages').innerHTML = '';
          this.currentChat.messages.forEach(msg => {
            this.addMessage(msg.role, msg.content);
          });
        }
      }
    } catch (e) {
      console.log('No previous chat found or error loading:', e);
    }
  }

  async saveCurrentChatToJson() {
    if (this.currentChat.messages.length > 0) {
      await window.electronAPI.saveCurrentChatJson(this.currentChat);
    }
  }

  updateCurrentChat(message, role) {
    this.currentChat.messages.push({
      role,
      content: message,
      timestamp: new Date().toISOString()
    });

    // Update title based on first user message if not set
    if (this.currentChat.messages.length === 1 && role === 'user') {
      this.currentChat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
    }

    // Auto-save to JSON
    this.saveCurrentChatToJson();
  }

  async saveChatToHistory(chatData) {
    if (!chatData || chatData.messages.length === 0)
      return;

    const payload = {
      id: chatData.id,
      title: chatData.title,
      messages: chatData.messages,
      date: chatData.messages[0]?.timestamp || new Date().toISOString()
    };

    const result = await window.electronAPI.saveChat(payload);
    if (result.success && !chatData.id) {
      chatData.id = result.id;
    }
  }

  async showHistoryModal() {
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');

    const result = await window.electronAPI.getChatHistory();
    if (result.success) {
      this.chatHistory = result.chats;
      list.innerHTML = '';

      if (this.chatHistory.length === 0) {
        list.innerHTML = '<div class="empty-state">No chat history yet</div>';
      } else {
        this.chatHistory.forEach(chat => {
          const item = document.createElement('div');
          item.className = 'history-item';
          item.innerHTML = `
            <div class="history-item-info">
              <div class="history-item-title">${chat.title || 'Untitled Chat'}</div>
              <div class="history-item-date">${new Date(chat.updated_at).toLocaleString()}</div>
            </div>
            <div class="history-item-actions">
              <button class="btn-load" data-id="${chat.id}">Load</button>
              <button class="btn-delete" data-id="${chat.id}">Delete</button>
            </div>
          `;
          list.appendChild(item);
        });

        // Add event listeners
        list.querySelectorAll('.btn-load').forEach(btn => {
          btn.addEventListener('click', (e) => this.loadChatFromHistory(e.target.dataset.id));
        });

        list.querySelectorAll('.btn-delete').forEach(btn => {
          btn.addEventListener('click', (e) => this.deleteChatFromHistory(e.target.dataset.id));
        });
      }
    }

    modal.classList.remove('hidden');
  }

  closeHistoryModal() {
    document.getElementById('history-modal')?.classList.add('hidden');
  }

  async loadChatFromHistory(chatId) {
    const result = await window.electronAPI.loadChat(chatId);
    if (result.success) {
      this.currentChat = {
        id: result.chat.id,
        title: result.chat.title,
        messages: result.chat.messages,
        date: result.chat.date
      };

      // Clear and rebuild UI
      document.getElementById('chat-messages').innerHTML = '';
      this.currentChat.messages.forEach(msg => {
        this.addMessage(msg.role, msg.content);
      });

      this.closeHistoryModal();
      this.saveCurrentChatToJson();
    } else {
      alert('Failed to load chat: ' + result.error);
    }
  }

  async deleteChatFromHistory(chatId) {
    if (!confirm('Are you sure you want to delete this chat?')) return;

    const result = await window.electronAPI.deleteChat(chatId);
    if (result.success) {
      // If deleting current chat, clear it
      if (this.currentChat.id === parseInt(chatId)) {
        this.startNewChat();
      }
      await this.showHistoryModal(); // Refresh list
    }
  }

  startNewChat() {
    // Save current chat to history first if it has messages
    if (this.currentChat.messages.length > 0 && !this.currentChat.id) {
      this.saveChatToHistory();
    }

    this.currentChat = {
      id: null,
      title: 'New Chat',
      messages: [],
      date: new Date().toISOString()
    };
    document.getElementById('chat-messages').innerHTML = '';
    this.saveCurrentChatToJson();

    this.renderWelcomeHub();
  }
}

const app = new App();

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    app.saveCurrentFile();
  }
});
