const OpenAI = {
  async isApiKeyValid(apiKey) {
    try {
      const result = await fetch("https://api.openai.com/v1/models", {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept-Encoding': 'gzip',
        }
      });

      if (result.status === 401)
        return { valid: false, message: "Invalid API key" };

      return { valid: true, message: null };
    }
    catch(e) {
      return { valid: false, message: e.message };
    }
  },

  async getAllModels(apiKey) {
    try {
      const result = await fetch("https://api.openai.com/v1/models", {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      const data = await result.json();
      return data.data;
    }
    catch(e) {
      throw e;
      return [];
    }
  },

  async sendChat(event, apiKey, message, selectedModel) {
    try {
      const result = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{
            role: "system",
            content: basePrompt
          },
          {
            role: "user",
            content: message
          }]
        })
      });

      const jsonResponse = await result.json();

      if (!result.ok) {
        const errMsg = jsonResponse.error.message;
        throw new Error(`Failed to connect to OpenAI. \nReason: ${errMsg}`);
      }

      else
        return jsonResponse;
    }
    catch(e) {
      throw(e);
    }
  },
}

module.exports = { OpenAI };
