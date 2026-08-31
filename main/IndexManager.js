const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const { pipeline } = require('@huggingface/transformers');

const embeddingModel = {
  // We cache the pipeline instance to avoid re-initializing on every call
  extractor: null,

  async embed(text) {
    const modelName =  'Salesforce/SFR-Embedding-Code-400M_R';

    if (!this.extractor) {
      try {
        this.extractor = await pipeline('feature-extraction', modelName, {
                                        // 'Snowflake/snowflake-arctic-embed-m', {
          device: 'webgpu', // GPU-accelerated
          revision: 'main' // for Salesforce
        });
      }

      catch(_) {
        console.warn('WebGPU unavailable, falling back to WASM');
        this.extractor = await pipeline('feature-extraction', modelName, {
          device: 'wasm',
          revision: 'main'
        });
      }
    }

    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    return output.data instanceof Float32Array
      ? output.data
      : new Float32Array(output.data);

    // return new Float32Array(output.data);
  }
};

class SmartChunker {
  constructor(chunkSize = 1028, overlap = 64) {
      this.chunkSize = chunkSize;
      this.overlap = overlap;
      // Priority of separators for recursive splitting
      this.separators = ["\n\n", "\n", ". ", " ", ""];
  }

  /**
    * Removes common "noise" patterns from text to prevent indexing unneeded info.
    */
  filterNoise(text) {
    return text
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove common boilerplate/log patterns (example: timestamps)
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g, '')
        .trim();
  }

  /**
    * Recursively splits text based on the separator hierarchy to maintain context.
    */
  splitRecursive(text, separators) {
    if (text.length <= this.chunkSize) {
        return [text];
    }

    // Find the best separator to split on
    let separator = separators[0];
    let separatorIndex = separators.findIndex(s => text.includes(s));

    if (separatorIndex === -1) {
        // Fallback to hard cut if no separators found
        return [text.substring(0, this.chunkSize), text.substring(this.chunkSize)];
    }

    separator = separators[separatorIndex];
    const remainingSeparators = separators.slice(separatorIndex + 1);

    const parts = text.split(separator);
    const finalChunks = [];
    let currentChunk = "";

    for (const part of parts) {
      if ((currentChunk + separator + part).length <= this.chunkSize) {
        currentChunk += (currentChunk === "" ? "" : separator) + part;
      }
      else {
        if (currentChunk)
          finalChunks.push(currentChunk);

        // If the part itself is too large, split it further recursively
        const subChunks = this.splitRecursive(part, remainingSeparators);
        finalChunks.push(...subChunks);
        currentChunk = "";
      }
    }

    if (currentChunk)
      finalChunks.push(currentChunk);

    return finalChunks;
  }

  chunk(text) {
    const cleanedText = this.filterNoise(text);
    const rawChunks = this.splitRecursive(cleanedText, this.separators);
    // Implement overlap by merging the end of one chunk with the start of the next
    const chunksWithOverlap = [];

    for (let i = 0; i < rawChunks.length; i++) {
      let content = rawChunks[i];

      if (i > 0) {
        const prevChunk = rawChunks[i - 1];
        const overlapText = prevChunk.slice(-this.overlap);
        content = overlapText + " " + content;
      }
      chunksWithOverlap.push(content);
    }

    return chunksWithOverlap;
  }
}

class DiskIndexManager {
  constructor(storageDir) {
    this.indexDir = path.join(storageDir, 'index');
    this.dataDir = path.join(storageDir, 'chunks');
    this.vectorDir = path.join(storageDir, 'vectors');

    this.metaFile = path.join(storageDir, 'metadata.bin');
    this.metaIndexFile = path.join(storageDir, 'metadata.idx');

    this.minQualityFloor = 0.5;
    this.maxResults = 20;

    this.stopWords = new Set([
      'a','an','the','and','or','but','if','then','else','for','of','on','in','at',
      'to','from','by','with','as','is','are','was','were','be','been','being',
      'have','has','had','do','does','did','will','would','should','can','could',
      'may','might','must','shall','this','that','these','those','there','here',
      'where','when','why','how','what','which','who','whom','whose',
      'your','my','his','her','its','our','their','i','you','he','she','we','they',
      'me','him','them','us','it','not','no','so','than','too','very','just','also',
      'only','any','some','all','each','every','own','same','into','onto','upon',
      'about','above','below','after','before','during','through','over','under',
      'again','further','once','up','down','off','out','id',
    ]);

    new Set([this.indexDir, this.dataDir, this.vectorDir])
      .forEach(dir => {
        fsSync.mkdirSync(dir, { recursive: true });
      });
  }

  async _storeFilePath(fileId, filePath) {
    const pathBuffer = Buffer.from(filePath, 'utf8');
    const length = pathBuffer.length;
    const fdData = await fs.open(this.metaFile, 'a');
    const offset = (await fdData.stat()).size;

    await fdData.write(pathBuffer);
    await fdData.close();

    // We use the fileId (SHA256) as the key
    const entry = Buffer.alloc(64 + 8 + 4);

    entry.write(fileId, 0, 64, 'utf8');
    entry.writeBigInt64LE(BigInt(offset), 64);
    entry.writeInt32LE(length, 72);

    await fs.appendFile(this.metaIndexFile, entry);
  }

  _hasCodeSignals(queryText) {
    // Bail on missing or absurdly large input (defensive + avoids pathological regex)
    if (!queryText || queryText.length > 8192)
      return false;

    // 1. Markdown code fences (```) or inline backticks
    if (/```/.test(queryText))
      return true;

    if (/`[^`\n]{2,}`/.test(queryText))
      return true;

    // 2. Common code keywords followed by code-like syntax
    //    e.g. "function foo()", "const x =", "def main():"
    if (/\b(function|const|let|var|class|def|return|if|else|import|from|export|require|module)\b\s*[=(:{[]/.test(queryText))
      return true;

    // 3. Code operators: =>, ===, !==, ==, !=
    if (/=>|===|!==|==|!=/.test(queryText))
      return true;

    // 4. Curly braces or semicolons (rare in prose, common in code)
    if (/[{};]/.test(queryText))
      return true;

    // 5. Method/property access chains: foo.bar.baz()
    if (/\b[a-zA-Z_$][\w$]*\s*\.\s*[a-zA-Z_$][\w$]*\s*\(/.test(queryText))
      return true;

    // 6. File paths or common source extensions
    if (/[\\/][\w.\-]+\.(js|ts|jsx|tsx|py|java|cpp|c|go|rs|rb|php)/i.test(queryText))
      return true;

    return false;
  }

  async _resolveFilePath(fileId) {
    if (!fsSync.existsSync(this.metaIndexFile))
      return "Unknown File";

    const idxBuffer = await fs.readFile(this.metaIndexFile);
    const entrySize = 76; // 64 + 8 + 4

    for (let i = 0; i < idxBuffer.length; i += entrySize) {
      const storedId = idxBuffer.toString('utf8', i, i + 64);

      if (storedId === fileId) {
        const offset = idxBuffer.readBigInt64LE(i + 64);
        const length = idxBuffer.readInt32LE(i + 72);

        const fdData = await fs.open(this.metaFile, 'r');
        const pathBuf = Buffer.alloc(length);
        await fdData.read(pathBuf, 0, length, Number(offset));
        await fdData.close();

        return pathBuf.toString('utf8');
      }
    }
    return "Unknown File";
  }

  _getShardPath(keyword) {
    const hash = crypto.createHash('md5').update(keyword).digest('hex').substring(0, 4);
    return path.join(this.indexDir, `${hash}.idx`);
  }

  // Helper for cosine similarity
  _cosineSimilarity(vecA, vecB) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async indexFile(filePath, onProgressCallback) {
    if (onProgressCallback)
      onProgressCallback(filePath);

    const baseName = path.basename(filePath).toLowerCase();
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      const badFolders = new Set([
        'node_modules',
        '__pycache__',
        'assets',
        '.git',
        '.github',
        'dist',
        'build',
        'target',
        'android',
        'ios'
      ]);

      if (badFolders.has(baseName)) {
        console.log('Folder skipped:', baseName)
        return;
      }

      const entries = await fs.readdir(filePath, { withFileTypes: true });

      for (const entry of entries) {
        await this.indexFile(path.join(filePath, entry.name), onProgressCallback);
      }
      return;
    }

    const badExt = new Set(['7z', 'zip', 'rar', 'exe', 'dll', 'so', 'bin', 'png', 'jpg', 'jpeg', 'gif', 'pdf', 'ico', 'icns', 'bak', 'sql']);
    const exclude = ['copy', 'package-lock'];

    for (const ext of badExt) {
      if (filePath.toLowerCase().endsWith(`.${ext}`)) {
        console.log('File skipped:', filePath)
        return
      }
    }

    if (exclude.some(p => filePath.toLowerCase().includes(p))) {
      console.log('File skipped:', filePath)
      return;
    }

    if (baseName.startsWith('.')) {
      console.log('File skipped:', baseName);
      return;
    }

    const content = await fs.readFile(filePath, 'utf8');
    const chunker = new SmartChunker();
    const chunks = chunker.chunk(content);
    const fileName = path.basename(filePath);
    const fileId = crypto.createHash('sha256').update(filePath).digest('hex');

    await this._storeFilePath(fileId, filePath);

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${fileId}_${i}`;

      // Prepend file name to chunk content for context
      const chunkWithFileName = `File: ${fileName}\n${chunks[i]}`;

      // Store the enhanced chunk
      await fs.writeFile(path.join(this.dataDir, chunkId), chunkWithFileName);

      // Embed the enhanced chunk (includes file name semantics)
      const vector = await embeddingModel.embed(chunkWithFileName);
      await fs.writeFile(path.join(this.vectorDir, `${chunkId}.vec`), Buffer.from(vector.buffer));

      // Extract keywords from enhanced chunk + file name parts
      const keywords = this._tokenize(chunkWithFileName);

      // Explicitly index file name tokens (handles names like "myFile.js")
      const fileNameTokens = fileName
        .replace(/\.[^.]+$/, '') // remove extension
        .split(/[\s\-_.]+/)
        .filter(t => t.length >= 3);

      for (const word of keywords) {
        await this._addToIndex(word, chunkId);
      }

      for (const token of fileNameTokens) {
        await this._addToIndex(token.toLowerCase(), chunkId);
      }
    }
  }

  _tokenize(text) {
    const split = text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_\-]/g, ' ');

    const words = split.toLowerCase().match(/\b\w{2,}\b/g) || [];
    return [...new Set(words.filter(word => !this.stopWords.has(word)))];
  }

  async _addToIndex(word, chunkId) {
    let entries = new Set();
    const shardPath = this._getShardPath(word);

    if (fsSync.existsSync(shardPath)) {
      entries = await fs.readFile(shardPath, 'utf8');
      entries = new Set(entries.split('\n').filter(Boolean));
    }

    if (!entries.has(chunkId)) {
      entries.add(chunkId);
      fs.writeFile(shardPath, [...entries].join('\n'));
    }

    entries.clear();
    entries = null;
  }

  async query(queryText) {
    /*
    if (this._hasCodeSignals(queryText))
      return [];
    */

    const queryVector = await embeddingModel.embed(queryText);
    const keywords = this._tokenize(queryText);
    const candidateChunks = new Map();

    // Keyword-based retrieval (BM25-lite)
    for (const word of keywords) {
      const shardPath = this._getShardPath(word);

      if (fsSync.existsSync(shardPath)) {
        let chunkIds = await fs.readFile(shardPath, 'utf8')
        chunkIds = chunkIds.split('\n').filter(Boolean);

        for (const id of chunkIds) {
          candidateChunks.set(id, (candidateChunks.get(id) || 0) + 1);
        }
      }
    }

    // Semantic Re-ranking / Vector Search
    const scoredResults = [];

    for (const [id, keywordScore] of candidateChunks.entries()) {
      const vecPath = path.join(this.vectorDir, `${id}.vec`);

      if (fsSync.existsSync(vecPath)) {
        const vecBuffer = await fs.readFile(vecPath);
        const chunkVector = new Float32Array(vecBuffer.buffer, vecBuffer.byteOffset, vecBuffer.byteLength / 4);
        const semanticScore = this._cosineSimilarity(queryVector, chunkVector);

        if (semanticScore >= this.minQualityFloor) {
          const keywordBoost = Math.min((keywordScore / keywords.length) * 0.5, 0.5);

        // Only include results that meet the minimum semantic similarity threshold
       // if (semanticScore >= this.similarityThreshold) {
          // Normalize keyword score to prevent it from dominating semantic relevance
          //const normalizedKeywordScore = Math.min(keywordScore / 10, 0.2);
          scoredResults.push({ id, score: semanticScore + keywordBoost });
            //normalizedKeywordScore });
        //}
        }
      }
    }

    const sortedIds = scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxResults) // Limit to Top-K
      .map(item => item.id);

    const results = [];

    for (const id of sortedIds) {
      const chunkPath = path.join(this.dataDir, id);

      if (fsSync.existsSync(chunkPath)) {
          const content = await fs.readFile(chunkPath, 'utf8');
          const fileId = id.split('_')[0];

          const fileName = await this._resolveFilePath(fileId);
          results.push(`File: ${fileName}\nContent: ${content}`);
      }
    }

    return results;
  }
}

module.exports = { DiskIndexManager };
