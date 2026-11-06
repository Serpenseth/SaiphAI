const { ProcessLauncher } = require('./ProcessLauncher.js');

const launchProcess = async (event, programName, args, options) => {
  return await ProcessLauncher.launch(programName, args, options);
}

module.exports = { launchProcess };
