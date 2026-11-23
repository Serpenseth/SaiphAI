import { DomQuery } from '../../utility/utilities.js';
import { FilePreview } from '../FilePreview.js';

const AttachedFiles = {
  attached: {
    fileName: [],
    fileType: [],
    fileContents: [],
  },

  clear() {
    this.attached = {
      fileName: [],
      fileType: [],
      fileContents: [],
    }
  },
}

const AttachedFilesHandler = {
  loadAttachedFiles(id) {
    const container = DomQuery.getElement(`chat-file-container-${id}`);
    const allAttachedFiles = container.querySelectorAll('.chat-file-item');

    if (allAttachedFiles) {
      Array.from(allAttachedFiles).forEach(ftab => {
        const ftabID = ftab.id;
        const fileData = FilePreview.getAttachedFileData(ftabID);

        AttachedFiles.attached.fileName.push(fileData.fileName);
        AttachedFiles.attached.fileType.push(fileData.fileType);
        AttachedFiles.attached.fileContents.push(fileData.fileContents);
      });
    }
  },

  handleAttachedFiles(id) {
    AttachedFilesHandler.loadAttachedFiles(id);

    const attachedFileNames = [];
    const attachedFiles = [];
    const attachedImages = [];
    const arrayLength = AttachedFiles.attached.fileType.length;

    if (arrayLength > 0) {
      for (let i = 0; i < arrayLength; i++) {
        const fname = AttachedFiles.attached.fileName[i];
        attachedFileNames.push(fname);

        const ftype = AttachedFiles.attached.fileType[i];

        if (ftype === 'file') {
          const fcontents = AttachedFiles.attached.fileContents[i];
          attachedFiles.push(fcontents);
        }

        else {
          const fcontents = AttachedFiles.attached.fileContents[i];
          attachedImages.push(fcontents);
        }
      }

      return {
        fileNames: attachedFileNames,
        files: attachedFiles,
        images: attachedImages
      };
    }

    else return null;
  },
}

export { AttachedFiles, AttachedFilesHandler };
