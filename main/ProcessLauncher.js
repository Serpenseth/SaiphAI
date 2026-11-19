const { spawn } = require('child_process');

const ProcessLauncher = {
  /**
    * Launches a program with specified arguments.
    *
    * @param {string} command - The executable to run.
    * @param {Array<string>} args - Array of arguments.
    * @param {Object} options - Spawn options.
    *
    * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
  */
  async launch(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        ...options,
        shell: false,
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data });
      child.stderr.on('data', (data) => { stderr += data });

      child.on('error', (err) => stderr = err);
      child.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode });
      });
    });
  }
}

module.exports = { ProcessLauncher };
