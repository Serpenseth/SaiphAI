class OpenAI {
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
  }

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
  }
}

module.exports = OpenAI;
