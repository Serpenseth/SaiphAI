const http = require('http');
const { SYSTEM_PROMPT } = require('./system_prompt.js');

class OllamaRequestsManager {
  constructor() {
    this.chatRequests = new Map();
  }

  set(id, request) {
    this.chatRequests.set(id, request);
  }

  remove(id) {
    this.chatRequests.delete(id);
  }

  get(id) {
    return this.chatRequests.get(id);
  }
}

let abortController = null;
const baseUrl = 'http://localhost:11434';

const OllamaManager = {
  async checkConnection() {
    try {
      const req = await fetch(`${baseUrl}/api/tags`);

      if (req.ok)
        return true;

      return false;
    }
    catch(e) {
      return false;
    }
  },

  async isModelInstalled(event, modelName) {
    try {
      const response = await fetch(`${baseUrl}api/tags`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const models = data.models;

      return models.some(model => model.name.includes(modelName));
    }
    catch (error) {
      return false;
    }
  },

  async getInstalledModels() {
    return new Promise((resolve, reject) => {
      const req = http.get(`${baseUrl}/api/tags`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.models || []);
          }
          catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', () => reject(new Error('Failed to connect')));
      req.setTimeout(1000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  },

  abortDownload() {
    abortController.abort();
    abortController = null;
  },

  async pullModel(event, modelName, onProgress) {
    abortController = new AbortController();

    try {
      const response = await fetch(`${baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
        signal: abortController.signal
      });

      if (response.status === 400) {
        console.error('model name:', modelName);
        throw new Error("This doesn't appear to be an Ollama model name");
      }

      // Use a stream reader to process chunks as they arrive
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done)
          break;

        // Decode current chunk and append to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split by newline to process complete JSON objects
        let lines = buffer.split('\n');

        // Keep the last partial line in the buffer for the next chunk
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine)
            continue;

          try {
            const data = JSON.parse(trimmedLine);

            if (data?.error) {
              // Invalid model name
              if(data.error.includes('pull model'))
                throw new Error("Model doesn't exist. Check the spelling, and try again");

              // Some other Ollama error
              else
                throw new Error(data.error);
            }

            let progressData = {
              ...data,
              modelName: modelName
            };

            if (data?.total && data?.completed) {
              const percent = (data.completed / data.total * 100).toFixed(2);

              if (percent === "100.00")
                continue;

              progressData.percent = percent;
            }
            else {
              progressData.percent = 0;
            }

            if (onProgress) {
              onProgress(progressData);
            }
          }
          catch (e) {
            throw e?.message || e?.error || e;
          }
        }
      }

      buffer = null;
    }
    catch (err) {
      if (err.name === 'AbortError') {
        throw 'Download cancelled';
      }
      else {
        throw err;
      }
    }
  },

   /**
 * Sends a chat request to the local Ollama API.
 *
 * @param {string} model - The model identifier.
 * @param {string|Array} messages - User message or array of message objects.
 * @param {string} SYSTEM_PROMPT - The system instruction.
 *
 * @throws {Error} On network failure or non-OK HTTP status.
 *
 * @returns {Promise<Object>} The parsed API response.
 *
 */
  async chat(event, messages, model) {
    const userMessages = Array.isArray(messages)
      ? messages
      : [{ role: 'user', content: messages }];

    const formattedMsg = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...userMessages,
    ];

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: formattedMsg,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (errorText.includes('fetch')) {
        throw new Error('Ollama is not running, or is not accepting connections');
      }

      throw new Error(errorText);
    }

    return response.json();
  }
}

module.exports = { OllamaManager };
