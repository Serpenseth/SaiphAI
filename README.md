[![Build and Release Electron App](https://github.com/Serpenseth/SaiphAI/actions/workflows/main.yml/badge.svg)](https://github.com/Serpenseth/SaiphAI/actions/workflows/main.yml)

SaiphAI is a desktop AI coding assistant built on Electron, designed for local operation with support for both lightweight on-device models (TinyLlama via Transformers.js) and external Ollama instances. The application provides integrated codebase indexing, persistent chat history, and a built-in code editor with context-aware retrieval.

# Core Capabilities

*   **Dual Model Support**: Operates either with TinyLlama 1.1B (fully local, runs in-browser via ONNX) or connects to local Ollama installations for access to larger models (CodeLlama, Mistral, etc.).
*   **Intelligent Workspace Indexing**: Recursively indexes workspace directories, respecting `.gitignore` patterns. Implements content chunking (1500 character blocks with 200 character overlap) and relevance scoring to provide precise code context to the AI.
*   **Resumable Model Downloads**: Supports checkpoint-based downloads for the TinyLlama model files, allowing pausing and resuming without data loss. Uses HTTP Range requests and ETag validation.
*   **Persistent Chat Management**: Stores conversation history in an SQLite database (via sql.js) with JSON serialization of message threads. Supports chat restoration, history browsing, and atomic save operations.
*   **Integrated Development Environment**: Embeds Monaco Editor for file viewing and editing, with support for multiple open tabs, scroll position restoration, and syntax highlighting.
*   **Real-time File Monitoring**: Utilizes Chokidar to watch workspace directories for changes, automatically updating the search index and UI when files are added, modified, or removed.
*   **Atomic Configuration Management**: Settings are written atomically using temporary files and rename operations, with automatic backup recovery in case of corruption.

# System Architecture

The application follows Electron's multi-process architecture:

*   **Main Process (`main.js`)**: Handles Node.js-level operations including file system access, database persistence (SQLite via sql.js), HTTP requests to Ollama, and native dialog integration. Implements the `WorkspaceIndex` class for content indexing and the `SettingsManager` class for configuration persistence with write queuing.
*   **Preload Script (`preload.js`)**: Securely exposes main process APIs to the renderer via ContextBridge, including Transformers.js loading, file operations, and IPC handlers.
*   **Renderer Process (`renderer.js`)**: Manages the user interface, Monaco Editor integration, chat state management, and download progress handling.

# Installation

## Requirements:
*   Node.js (v18 or later)
*   npm or yarn

### Steps:
Clone the repository
```bash
git clone "https://github.com/Serpenseth/saiphai"
```
Enter into the cloned directory
```bash
cd saiphai
```
Install `SaiphAI`
```bash
npm install
```
Finally, run `SaiphAI`
```bash
npm start
```

# Initial Configuration

On first launch, the application prompts for model selection:
*   **TinyLlama**: Downloads approximately 600MB of model files to the user's application data directory. Supports resumable downloads if interrupted.
*   **Ollama**: Requires a running Ollama instance on `localhost:11434`. The application queries available models via the Ollama API.

Workspace selection can be performed at any time via the interface. The application indexes the selected directory, excluding common patterns (node_modules, .git, build directories, etc.) and respecting `.gitignore` files.

# File Operations and Indexing

The `WorkspaceIndex` class maintains an in-memory map of file metadata and content. When a query is submitted:
1.  Files are scored based on path matching and content relevance.
2.  Large files are split into overlapping chunks.
3.  Chunks are scored based on term frequency, exact phrase matching, and code reference detection (function definitions, class declarations).
4.  Top-scoring chunks are assembled into a context window (3000 characters for TinyLlama, 10000 for Ollama) and prepended to the system prompt.

File modifications are tracked via Chokidar watchers, with debounced index updates to handle batch operations (e.g., git checkout, npm install).

# Chat and Context Management

Conversations are structured with a system prompt (`BASE_SYSTEM_PROMPT`) that instructs the model on code quality standards (SOLID principles, DRY, security considerations). User messages can include:
*   Direct text input
*   Attached files (via file picker)
*   Automatically retrieved workspace context (via semantic search)

Chat history is persisted in two layers:
1.  Current session state is saved to JSON for crash recovery.
2.  Completed conversations are stored in SQLite with timestamps and titles derived from the first user message.

# Technical Implementation Details

*   **Atomic Writes**: Configuration files are written to a temporary location, then renamed into place to prevent corruption during write operations. Backups are maintained and automatically restored if the primary file is corrupted.
*   **Download State Management**: Download progress for model files is tracked per-file, storing byte offsets and ETags to enable resume capabilities across application restarts.
*   **Database Initialization**: Uses sql.js to create an in-memory SQLite instance that is serialized to disk on every write operation, ensuring durability without requiring native SQLite bindings.
*   **File Chunking Strategy**: Implements a sliding window approach with overlap to ensure code blocks spanning chunk boundaries remain contextually intact.

# Build System

SaiphAI includes a secure, integrated build system supporting multiple languages and frameworks.

## Supported Languages

The build system automatically detects project types and configures appropriate commands:

Language | Detection Files | Default Commands

JavaScript/TypeScript | `package.json`, `tsconfig.json` | `npm run build`, `npx tsc`
Python | `requirements.txt`, `pyproject.toml`, `setup.py` | `python -m build`, `pip install`
Rust | `Cargo.toml` | `cargo build --release`
Go | `go.mod` | `go build` |
Java | `pom.xml`, `build.gradle` | `mvn package` |
C# | `.csproj`, `.sln` | `dotnet build` |
C/C++ | `CMakeLists.txt`, `Makefile` | `make`, `cmake` |

## Security Features

The build system implements strict security controls:

- **Command Whitelisting**: Only approved build tools (npm, cargo, make, etc.) can execute
- **Pattern Blocking**: Prevents shell injection attacks by blocking dangerous patterns (`rm -rf`, `curl | sh`, path traversal attempts)
- **Workspace Validation**: Builds are restricted to the selected workspace directory
- **Safe Execution**: Uses `execFile` instead of shell execution to prevent injection attacks

## Usage

Builds can be triggered from the integrated build panel in the UI:

1. **Automatic Detection**: Open a workspace folder to automatically detect the build configuration
2. **Quick Actions**: Execute standard commands (Build, Install, Test) via the build panel buttons
3. **Custom Scripts**: For Node.js projects, quickly run any script from `package.json`
4. **Real-time Output**: View build progress and output in the integrated terminal
5. **Error Analysis**: Failed builds offer AI-powered error analysis to identify root causes and suggest fixes

## Build History

The system maintains a history of recent builds:

- View duration, status, and exit codes of previous builds
- Re-run previous builds with one click
- Automatic cleanup of old build records
- Persistent across application restarts

## Build Configuration

Build settings are automatically inferred from project files:

- **JavaScript/TypeScript**: Detects available npm scripts and TypeScript configuration
- **Python**: Identifies build backends (setuptools, poetry, etc.)
- **Multi-language projects**: Scans file extensions to determine dominant language when no config files are present

Build output is limited to 10MB per build to prevent memory issues, with a default timeout of 5 minutes

# Security Considerations

*   ContextIsolation is enabled in the BrowserWindow configuration.
*   NodeIntegration is disabled; all main process communication flows through the preload script's ContextBridge.
*   File system access is restricted to user-selected directories (workspace) and application-specific data directories (model cache, settings).

# Development

### Build distribution:
```bash
npm run build
```

The build process uses electron-builder, outputting to the `dist` directory. Configuration is specified in `package.json`.

# File Structure

```
saiphai/
├── main/
│   └── index.js          # Electron main process, IPC handlers, indexing logic
├── preload/
│   └── preload.js        # ContextBridge API definitions
├── renderer/
│   ├── index.html        # Application markup
│   ├── renderer.js       # UI logic, editor integration, chat management
│   └── styles.css        # Application styles
├── package.json          # Dependencies and build configuration
├── package-lock.json     # Dependency lock file
└── README.md             # Project documentation
```

# Dependencies

### Key runtime dependencies:
*   `@xenova/transformers`: For loading and running TinyLlama in the browser context
*   `sql.js`: SQLite compiled to WebAssembly for chat persistence
*   `chokidar`: File watching
*   `ignore`: Gitignore pattern matching for indexing
*   `marked`: Markdown parsing for chat rendering

# Limitations and Known Issues

*   TinyLlama requires approximately 1.5GB of RAM for the quantized model.
*   Workspace indexing loads entire file contents into memory; extremely large codebases may impact performance.
*   File watching on Windows may have slight delays compared to macOS/Linux due to Node.js fs.watch limitations.

# License

MIT
