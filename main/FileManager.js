const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class FileManager {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async *scanFolder() {
    const directory = await fs.opendir(this.filePath);

    for await (const entry of directory) {
      const fullPath = path.join(this.filePath, entry.name);

      if (entry.isFile()) { yield fullPath }
      else if (entry.isDirectory()) { yield* this.scanFolder(fullPath) }
    }
  }

  async doesFileExist() {
    const contents = this.readConfigFile(this.filePath);
    return contents === undefined || contents === null;
  }

  async *readFiles() {
    const directory = await fs.opendir(this.filePath);

    for await (const entry of dir) {
      if (entry.isFile()) {
        const fileP = path.join(this.filePath, entry.name);
        // Yield a stream instead of the full content to keep memory usage constant
        yield {
          fileName: entry.name,
          stream: fs.createReadStream(fileP)
        }
      }
    }
  }

  async readFile() {
    return await fs.readFile(this.filePath, 'utf8');
  }

  async getFolderTree() {
    const dirPath = this.filePath;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.name.startsWith('.'))
        continue;

      if (['node_modules', '__pycache__', 'dist', 'build'].includes(entry.name))
        continue;

      items.push({
        name: entry.name,
        path: fullPath,
        //relativePath,
        isDirectory: entry.isDirectory(),
        extension: entry.isFile() ? path.extname(entry.name) : null
      });
    }

    return items.sort((a, b) => {
      if (a.isDirectory === b.isDirectory)
        return a.name.localeCompare(b.name);

      return a.isDirectory ? -1 : 1;
    });
  }

  async isImage() {
    let fileType = null;
    const contents = await fs.open(this.filePath, 'r');

    try {
      const { buffer } = await contents.read(Buffer.alloc(12), 0, 12, 0);
      const view = new Uint8Array(buffer);

      const check = (bytes, offset = 0) =>
        bytes.every((byte, i) => view[offset + i] === byte);

      if (check([0xFF, 0xD8, 0xFF]))
        fileType = 'jpeg';

      else if (check([0x89, 0x50, 0x4E, 0x47]))
        fileType = 'png';

      else if (check([0x47, 0x49, 0x46]))
        fileType = 'gif';

      else if (check([0x52, 0x49, 0x46, 0x46]) && check([0x57, 0x45, 0x42, 0x50], 8))
        fileType = 'webp';

      else fileType = 'file';
    }
    finally {
      await contents.close();
      return fileType;
    }
  }

  async cleanImage(imagePath) {
    console.log(imagePath);
    const cleanedImage =  await sharp(imagePath)
      .rotate()
      .resize(2560, 2560, {
        fit: 'contain',
        // fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        // withoutEnlargement: true,
      })
      .png({ compressionLevel: 9 })
      /*
      .jpeg({
        quality: 90,
        chromaSubsampling: '4:4:4',
      })
      */
      .toBuffer();

    return cleanedImage;
  }
}

module.exports = FileManager;
