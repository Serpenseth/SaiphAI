const OpenAiModels = {
  cached: [],
  excludedTags: [
    'embedding', 'audio', 'image',
    'transcribe', 'whisper', 'tts',
    'sora', 'search', 'babbage',
    'translate', 'realtime'
  ],

  handle(models) {
    return models.filter(m => {
      return !this.excludedTags.some(e => m.id.toLowerCase().includes(e));
    })
    .map(m => { return m.id });
  },
}

export { OpenAiModels };
