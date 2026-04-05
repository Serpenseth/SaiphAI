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
    // Load current chat from JSON on init
    this.loadCurrentChatFromJson();
    // Welcome hub
    this.showWelcomeHub = !this.config.hideWelcomeHub;
    this.hubUpdateTimeout = null;
    // Active file
    this.activeFilePath = null;
    // Build related
    this.activeBuilds = new Map();
    this.buildHistory = [];
    this.currentBuildConfig = null;

    this.init();
  }

  // Debounced version for scroll events
  debouncedSaveEditorState = this.debounce(() => this.saveEditorState(), 500);

  async init() {
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

    // Load config
    this.config = await window.electronAPI.getConfig();
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

      if (this.config.lastWorkspace) {
        this.workspacePath = this.config.lastWorkspace;
        setTimeout(() => this.loadWorkspace(this.config.lastWorkspace), 1000);
      }
    }

    document.getElementById('app').classList.remove('hidden');
    this.initMonaco();

    window.electronAPI.onFileSystemEvent((data) => {
      this.handleFileSystemChange(data);
    });

    this.renderWelcomeHub();

    this.config = await window.electronAPI.getConfig();
    this.activeFilePath = this.config.activeFile || null; // Restore from settings

    if (this.config.lastWorkspace) {
      this.workspacePath = this.config.lastWorkspace;

      setTimeout(async () => {
        await this.loadWorkspace(this.config.lastWorkspace);

        // Restore all open tabs and scroll positions
        await this.restoreEditorState();

        // Re-apply active file class in tree if needed
        if (this.activeFilePath) {
          const el = document.querySelector(`[data-path="${CSS.escape(this.activeFilePath)}"]`);

          if (el)
            el.classList.add('active-file');
        }
      }, 1000);
    }

    window.addEventListener('beforeunload', () => {
      this.saveEditorState();
    });
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

    document.getElementById('build-toggle-btn').addEventListener('click', () => {
      this.toggleBuildPanel();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const panel = document.getElementById('build-panel');
            if (panel?.classList.contains('visible')) {
                this.toggleBuildPanel();
            }
        }
    });

    document.getElementById('btn-pause-download')?.addEventListener('click', () => this.togglePauseDownload());
    document.getElementById('btn-stop-download')?.addEventListener('click', () => {
      this.stopDownload();
      this.showFirstRunModal();
    });
    document.getElementById('btn-cancel-download')?.addEventListener('click', () => this.cancelDownload());

    document.getElementById('option-tinyllama')?.addEventListener('click', () => {
      console.log('TinyLlama selected');
      this.selectModel('tinyllama');
    });

    // Ollama option - Requires external Ollama
    document.getElementById('option-ollama')?.addEventListener('click', () => {
      console.log('Ollama selected');
      this.selectModel('ollama');
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettingsModal());
    document.getElementById('btn-select-workspace')?.addEventListener('click', () => this.selectWorkspace());
    document.getElementById('btn-refresh-index')?.addEventListener('click', () => this.rebuildIndex());

    document.getElementById('btn-send')?.addEventListener('click', () => this.sendMessage());
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    document.getElementById('insert-file')?.addEventListener('click', () => this.selectFiles());
    document.getElementById('chat-input')?.addEventListener('input', (e) => {
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
    });

    document.getElementById('ollama-model-selector')?.addEventListener('change', (e) => {
      this.currentOllamaModel = e.target.value;
      // Optionally save to config
      window.electronAPI.setConfig({
        modelType: 'ollama',
        modelName: this.currentOllamaModel
      });
    });

    document.getElementById('history')?.addEventListener('click', () => this.showHistoryModal());
    document.getElementById('btn-close-history')?.addEventListener('click', () => this.closeHistoryModal());
    document.getElementById('btn-new-chat')?.addEventListener('click', () => {
      this.startNewChat();
      this.closeHistoryModal();
    });
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

    // Only show if enabled and chat is empty
    if (!this.showWelcomeHub || this.currentChat.messages.length > 0 || this.currentChat.id) {
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

    // Load from local files once downloaded
    this.tinyLlamaPipeline = await pipeline(
      'text-generation',
      'Xenova/TinyLlama-1.1B-Chat-v1.0',
      {
        progress_callback: progressCallback || ((x) => console.log('Loading:', x.status, x)),
        quantized: true,
        local_files_only: true // Use downloaded files
      }
    );

    console.log('TinyLlama ready');
    // Clear download state on success
    await window.electronAPI.clearDownloadState?.('tinyllama');
  }

  async selectModel(modelType) {
    if (this.isDownloading || this.downloadPaused)
      return;

    this.isDownloading = true;

    // Only show download UI for TinyLlama
    if (modelType === 'tinyllama') {
      document.getElementById('first-run-modal')?.classList.add('hidden');
      document.getElementById('download-modal')?.classList.remove('hidden');
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
        // ... existing TinyLlama download logic ...
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

        // Safe Ollama initialization with error handling
        try {
          await this.populateOllamaModels();
        }
        catch (ollamaErr) {
          console.error('Failed to populate Ollama models:', ollamaErr);
          this.updateStatus('Ollama selected (model list unavailable)');
        }
      }

      this.config = await window.electronAPI.getConfig();

      // Only hide download modal if it was shown (TinyLlama case handled in finally)
      if (modelType !== 'tinyllama') {
        document.getElementById('download-modal')?.classList.add('hidden');
      }

      const chatMessages = document.getElementById('chat-messages');

      if (chatMessages) {
        chatMessages.innerHTML = '';
        const msg = modelType === 'tinyllama'
          ? '✅ **TinyLlama** loaded!'
          : '✅ Ollama ready to go!';
        this.addMessage('assistant', msg);
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

      if (modelType !== 'tinyllama') {
        setTimeout(() => this.renderWelcomeHub(), 100);
      }
    }
  }

  async populateOllamaModels() {
    if (!this.ollamaModelSelect) {
      console.warn('Ollama model selector not found in DOM');
      return;
    }

    if (this.currentModel !== 'ollama') {
      this.ollamaModelSelect.classList.add('hidden');
      return;
    }

    try {
      const result = await window.electronAPI.getOllamaModels();
      if (result.success && result.models.length > 0) {
        this.availableOllamaModels = result.models;
        this.ollamaModelSelect.innerHTML = result.models.map(m =>
          `<option value="${m.name}" ${m.name === this.currentOllamaModel ? 'selected' : ''}>${m.name}</option>`
        ).join('');
        this.ollamaModelSelect.classList.remove('hidden');

        if (!this.currentOllamaModel && result.models.length > 0) {
          this.currentOllamaModel = result.models[0].name;
          this.ollamaModelSelect.value = this.currentOllamaModel;
        }
      }
      else {
        this.ollamaModelSelect.innerHTML = '<option value="">No models found</option>';
        this.ollamaModelSelect.classList.remove('hidden');
      }
    }
    catch (e) {
      console.error('Failed to get Ollama models:', e);
      this.ollamaModelSelect.innerHTML = '<option value="">Connection error</option>';
      this.ollamaModelSelect.classList.remove('hidden');
    }
  }

  async sendMessage(text = null) {
    const input = document.getElementById('chat-input');
    const message = text || input.value.trim();

    if (!message)
      return;

    if (!text)
      input.value = '';

    this.addMessage('user', message);
    this.updateCurrentChat(message, 'user');

    const loadingId = this.addMessage('assistant', '<div class="loading"></div> Thinking...');

    try {
      let responseText;
      let relevantFiles = [];
      const basePrompt = await window.electronAPI.getSystemPrompt();
      let contextPrompt = basePrompt;

      const isTinyLlama = this.currentModel === 'tinyllama';

      if (this.attachedFiles.length > 0) {
        contextPrompt += `\n\nThe user has uploaded ${this.attachedFiles.length} file(s). `;
        contextPrompt += `Relevant sections have been selected based on the question. `;
        contextPrompt += `Analyze relationships between different sections of the code.\n\n`;

        const fileContext = await this.buildSmartContext(
          this.attachedFiles,
          message,
          isTinyLlama
        );

        contextPrompt += fileContext;
      }

      else if (this.workspacePath) {
        try {
          relevantFiles = await window.electronAPI.searchIndex?.(message, true) || [];
        }
        catch (e) {
          console.warn('Index search unavailable:', e);
        }

        if (relevantFiles.length > 0) {
          const filesWithContent = relevantFiles.slice(0, isTinyLlama ? 3 : 6).map(f => {
            // If chunks are available, concatenate them with line number annotations
            let content;
            if (f.chunks && f.chunks.length > 0) {
              content = f.chunks.map(chunk =>
                `// Lines ${chunk.startLine}-${chunk.endLine}\n${chunk.content}`
              ).join('\n\n');
            } else {
              // Fallback to full content or read from disk
              content = f.content;
            }

            return {
              ...f,
              content: content || '',
              path: f.absolutePath || f.path
            };
          });

          const fileContext = await this.buildSmartContext(
            filesWithContent,
            message,
            isTinyLlama
          )

          if (fileContext) {
            contextPrompt += `\n\nRelevant workspace files:\n\n${fileContext}`;
          }
        }
      }

      const fullPrompt = `<|system|>\n${contextPrompt}</s>\n<|user|>\n${message}</s>\n<|assistant|>\n`;

      if (isTinyLlama && this.tinyLlamaPipeline) {
        const output = await this.tinyLlamaPipeline(fullPrompt, {
          max_new_tokens: 1024,
          temperature: 0.3,
          do_sample: true,
          top_k: 128
        });
        responseText = output[0].generated_text.replace(fullPrompt, '').trim();
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

      document.getElementById(loadingId)?.remove();

      this.addMessage('assistant', responseText);
      this.updateCurrentChat(responseText, 'assistant');
      this.attachedFiles = [];
      this.renderAttachedFiles();

      if (this.currentChat.messages.length >= 2 && !this.currentChat.id) {
        await this.saveChatToHistory();
      }
    }
    catch (e) {
      document.getElementById(loadingId)?.remove();
      this.addMessage('assistant', `Error: ${e.message}`);
    }
  }

  handleFileSystemChange({ eventType, relativePath, absolutePath }) {
    if (!this.workspacePath)
      return;

    console.log(`File event: ${eventType} - ${relativePath}`);

    // Handle specific events immediately if needed
    switch (eventType) {
      case 'add':
      case 'unlink':
      case 'addDir':
      case 'unlinkDir':
        // Structural changes - full tree refresh needed
        this.pendingChanges.add('structure');
        break;
      case 'change':
        // Content change - update index only for this file
        this.updateFileInIndex(relativePath);
        break;
    }

    // Debounce rapid successive events (git checkout, npm install, etc.)
    clearTimeout(this.fsChangeTimeout);
    this.fsChangeTimeout = setTimeout(async () => {
      await this.refreshWorkspaceView();
    }, 50);
  }

  async refreshWorkspaceView() {
    //alert('Refreshing view, pending changes:', this.pendingChanges);

    if (this.pendingChanges.has('structure')) {
      try {
        await this.loadFileTree(this.workspacePath);
        await window.electronAPI.buildIndex();
      }
      catch(e) {
        console.error(e);
        throw e;
      }
      finally {
        this.pendingChanges.clear();
      }
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
        path: file.path,
        name: file.name,
        viewState: file.editor ? file.editor.saveViewState() : null
      });
    }

    await window.electronAPI.setConfig({
      openFiles: openFilesData,
      activeFile: this.activeFilePath
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
    if (!config.openFiles || config.openFiles.length === 0) return;

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
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs',
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

  getLanguageFromExt(ext) {
    const map = { '.js': 'javascript', '.ts': 'typescript', '.html': 'html', '.css': 'css', '.py': 'python', '.json': 'json', '.md': 'markdown' };
    return map[ext] || 'plaintext';
  }

  switchToTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

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

    const file = this.openFiles.get(tabId);

    if (file?.path === this.activeFilePath)
      this.setActiveFile(null);

    if (file?.modified && confirm('Save changes?'))
      await this.saveCurrentFile(tabId);

    await this.saveEditorState();

    document.querySelector(`[data-tab="${tabId}"]`)?.remove();
    document.getElementById(tabId)?.remove();
    this.openFiles.delete(tabId);

    if (this.openFiles.size === 0) {
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

    const count = await window.electronAPI.buildIndex();
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
        if (chunkLower.includes(ref.toLowerCase())) score += 3;
      });

      return { ...chunk, score };
    }).sort((a, b) => b.score - a.score);
  }

  async buildSmartContext(files, query, isTinyLlama = true) {
    const maxChars = isTinyLlama ? 3000 : 10000;
    let context = '';
    let usedChars = 0;

    for (const file of files) {
      // Ensure we have full content, not just preview
      let content = file.content;

      if (!content && file.path) {
        try {
          content = await window.electronAPI.readFile(file.path);
        } catch (e) {
          continue;
        }
      }
      if (!content) continue;

      const fileName = file.name || file.relativePath || 'file';

      // If file is small enough, include entirely
      if (content.length < 2000 && usedChars + content.length < maxChars) {
        context += `File: ${fileName}\n\`\`\`\n${content}\n\`\`\`\n\n`;
        usedChars += content.length;
        continue;
      }

      // For larger files, extract relevant chunks
      const chunks = this.chunkFileContent(content);
      const scoredChunks = this.scoreChunkRelevance(chunks, query);

      // Select top chunks until we hit the limit
      let fileContext = '';
      let fileChars = 0;

      for (const chunk of scoredChunks) {
        if (usedChars + fileChars + chunk.content.length > maxChars)
          break;

        if (chunk.score === 0)
          continue; // Skip irrelevant chunks

        fileContext += `// Lines ${chunk.startLine}-${chunk.endLine}\n${chunk.content}\n\n`;
        fileChars += chunk.content.length + 50;
      }

      if (fileContext) {
        context += `File: ${fileName}\n\`\`\`\n${fileContext}\n\`\`\`\n\n`;
        usedChars += fileChars;
      }
    }

    return context;
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
            if (confirm(`Switch to ${selectedModel === 'tinyllama' ? 'TinyLlama' : 'Ollama'}? This may require downloading files.`)) {
                await this.selectModel(selectedModel);
            }
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
    // Create container if it doesn't exist (place it before the textarea)
    let container = document.getElementById('attached-files-container');

    if (!container) {
      const chatInput = document.getElementById('chat-input');

      container = document.createElement('div');
      container.id = 'attached-files-container';
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

  async saveChatToHistory() {
    if (this.currentChat.messages.length === 0) return;

    const result = await window.electronAPI.saveChat(this.currentChat);
    if (result.success) {
      this.currentChat.id = result.id;
      await this.saveCurrentChatToJson();
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
