/**
 * Uses a frequency-based scoring algorithm to identify the most significant
 * sentences in a document while guaranteeing the inclusion of mandatory text.
 */
class TextSummarization {
  constructor() {
    //this.MAX_INPUT_SIZE = 1024 * 1024 * 32; // limit to prevent OOM
    this.STOP_WORDS = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
      'at', 'from', 'into', 'during', 'including', 'until', 'against',
      'among', 'throughout', 'despite', 'towards', 'upon', 'for', 'with',
      'about', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should'
    ]);
  }

  /**
    *   @param {string} content - The raw file content.
    *   @param {string} mandatoryText - Text that must be present in the output.
    *
    *   @returns {string} The summarized content.
  */
  summarize(content, mandatoryText) {
    if (typeof content !== 'string' || typeof mandatoryText !== 'string') {
      throw new TypeError('Invalid input: content and mandatoryText must be strings.');
    }
/*
    if (content.length > this.MAX_INPUT_SIZE) {
      throw new Error('Content exceeds maximum allowable size for processing.');
    }*/

    const trimmedContent = content.trim();
    const trimmedMandatory = mandatoryText.trim();

    if (!trimmedContent)
      return trimmedMandatory;

    if (!trimmedMandatory)
      return this._extractKeySentences(trimmedContent);

    const summary = this._extractKeySentences(trimmedContent);
    return this._guaranteeInclusion(summary, trimmedMandatory);
  }

  _extractKeySentences(text) {
    // Split into sentences using a regex that respects common abbreviations
    const sentences = text.match(/[^.!?\s][^.!?]*(?:[.!?](?!.))?/g) || [text];

    if (sentences.length <= 3)
      return sentences.join(' ').trim();

    const wordFrequencies = new Map();
    const words = text.toLowerCase().split(/\W+/);

    // Calculate word frequencies excluding stop words
    words.forEach(word => {
      if (word && !this.STOP_WORDS.has(word)) {
        wordFrequencies.set(word, (wordFrequencies.get(word) || 0) + 1);
      }
    });

    // Score sentences based on the sum of their word frequencies
    const sentenceScores = sentences.map((sentence, index) => {
      const sentenceWords = sentence.toLowerCase().split(/\W+/);
      let score = 0;
      sentenceWords.forEach(word => {
        score += wordFrequencies.get(word) || 0;
      });
      return { index, score, text: sentence };
    });

    // Sort by score descending and take top 3 sentences
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .sort((a, b) => a.index - b.index); // Restore original order

    return topSentences.map(s => s.text.trim()).join(' ');
  }

  _guaranteeInclusion(summary, mandatory) {
    const lowerSummary = summary.toLowerCase();
    const lowerMandatory = mandatory.toLowerCase();

    if (lowerSummary.includes(lowerMandatory)) {
      return summary;
    }

    // Append mandatory text with a clean separator
    const separator = summary.endsWith('.') ? ' ' : '. ';

    return `${summary}${separator}${mandatory}`.trim();
  }
}

module.exports = { TextSummarization }

