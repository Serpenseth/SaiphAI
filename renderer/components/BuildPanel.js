import {
  StringUtils,
  DomQuery,
} from '../utility/utilities.js';

import { WhitelistCmds } from './whitelist_commands.js';

const BuildPanelUI = {
  create(workspacePath) {
    return `
      <div>
        <p id='terminal-workspace-path'>${workspacePath}</p>
        <div style='display: flex; flex-direction: row; margin: 0rem 0.35rem'>
          <p style='color: rgba(236, 235, 234, 0.7)'>></p>
          <input id='terminal-cmd' class='terminal-cmd' style='width: 100vw'></input>
        </div>
      </div>
    `;
  },

  createCmdResponse(stdout, stderr) {
    if (stdout) {
      return `
        <div style='margin: -0.25rem 0.35rem; font-size: 0.9rem;'>
          <p id='cmd-output' style='width: 100vw'>${stdout}</p>
        </div>
      `;
    }
  }
}

const Ui = {
  appendEntry() {
    let entry = BuildPanelUI.create(BuildPanelData.workspace);
    entry = DomQuery.htmlTemplateToDOM(entry);
    DomQuery.appendChild('terminal', entry);

    const field = DomQuery.getElement('terminal-cmd');
    setTimeout(() => field.focus(), 200);
  },
}

const BuildPanelData = {
  workspace: null,
}

const CommandHandler = {
  async execCmd(userCmd) {
    const splitEntry = userCmd.split(' ');
    const initialCmd = splitEntry[0];
    const argsLength = splitEntry.length;

    if (!WhitelistCmds.has(initialCmd)) {
      return;
    }

    const ret = await window.electronAPI.launchProcess(initialCmd, splitEntry.slice(1, argsLength));
    console.log(ret.stdout);

    const stdoutTemplate = BuildPanelUI.createCmdResponse(ret.stdout, null);
    const stdoutHTML = DomQuery.htmlTemplateToDOM(stdoutTemplate);
    DomQuery.appendChild('terminal', stdoutHTML);

    Ui.appendEntry();
  },
}

const EventHandler = {
  setupInputEvent(element, fn) {
    const elem = DomQuery.getElement(element);

    if (elem)
      elem.addEventListener('keydown', fn);
  },

  setupKeyPressEvent(fn) {
    document.addEventListener('keydown', fn);
  },
}

const BuildPanel = {
  init(workspacePath) {
    BuildPanelData.workspace = workspacePath;
    Ui.appendEntry();

    const field = DomQuery.getElement('terminal-cmd');
    EventHandler.setupInputEvent('terminal-cmd', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        CommandHandler.execCmd(field.value)
      }
    });
  },
}

export { BuildPanel };
