const os = require('os');
const path = require('path');

const Piscina = require('piscina');
const piscina = new Piscina({
  filename: path.resolve(__dirname, 'worker.js'),
  maxThreads: os.cpus().length,
});

module.exports = { piscina };
