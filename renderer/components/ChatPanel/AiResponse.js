import { AiBackend } from './WindowAPI.js';
import { AttachedFiles } from './AttachedFiles.js';

import { FilePreview } from '../FilePreview.js';
import { ChatTab } from '../ChatTab/ChatTab.js';

const BlobHandler = {
  convertToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
}

const AiResponse = {
  // Ollama expects a string
  normalize(data) {
    const textParts = data.content
      .filter(p => p.type === 'text')
      .map(p => p.text)
      .join('\n');

    const images = data.content
      .filter(p => p.type === 'image_url')
      .map(p => {
        const url = p.image_url.url;
        return url.startsWith('data:') ? url.split(',')[1] : url;
      });

    return {
      ...data,
      content: textParts,
      ...(images.length ? { images } : {})
    }
  },

  async buildContextString(selectedModel, supportsVision, attachedFiles) {
    let contextString = '\n\nAttached Files Context:\n\n';
    const imagePayloads = [];
    const errMsg = `${selectedModel} does not support images.
    Please remove attached images, and try again, or select a different model`;

    const totalFiles = attachedFiles.files.length;
    const totalImages = attachedFiles.images.length;

    try {
      if (totalFiles > 0) {
        contextString = '\n\nAttached Files Context:\n\n';

        for (let i = 0; i < totalFiles; i++) {
          const fileContent = attachedFiles.files[i];
          const fileName = attachedFiles.fileNames[i];
          contextString += `File name:${fileName}, file contents: ${fileContent}\n\n`;
        }
      }

      if (totalImages > 0) {
        if (!supportsVision) {
          throw errMsg;
        }

        for (let i = 0; i < totalImages; i++) {
          const imageBlob = attachedFiles.images[i];
          const fileName = attachedFiles.fileNames[i];
          const base64Image = await BlobHandler.convertToBase64(imageBlob);

          imagePayloads.push({
            fileName: fileName,
            imageBlob: base64Image
          });
        }
      }

      if (totalImages > 0 || totalFiles > 0) {
        FilePreview.destroy(ChatTab.getActiveTab());
        AttachedFiles.clear();
      }

      return { contextString: contextString, imagePayloads: imagePayloads }
    }
    catch(e) {
      throw e;
    }
  },

  async generate(config, prevChats, message, attachedFiles=null) {
    let history = [];

    for (let i = 0; i < prevChats.user.length; i++) {
      history.push({
        role: 'user',
        content: prevChats.user[i]
      });

      history.push({
        role: 'assistant',
        content: prevChats.system[i]
      });
    }

    const selectedFramework = config.modelFramework;
    const selectedModel = config.selectedModel;

    console.log(selectedModel);

    if (attachedFiles) {
      try {
        let supportsVision;
        let fullTextMessage;

        if (selectedFramework === 'ollama')
          supportsVision = await AiBackend.supportsVision(selectedModel);

        const context = await AiResponse.buildContextString(
          selectedModel,
          supportsVision,
          attachedFiles
        );

        const contextString = context.contextString;
        const imagePayloads = context.imagePayloads;

        fullTextMessage = message + contextString;

        let finalUserContent = fullTextMessage;

        if (imagePayloads.length > 0) {
          finalUserContent = [
            { type: 'text', text: fullTextMessage },
            ...imagePayloads.map(img => ({
              type: 'image_url',
              image_url: { url: img.imageBlob }
            }))
          ];
        }

        if (selectedFramework === 'ollama') {
          if (Array.isArray(finalUserContent)) {
            finalUserContent = AiResponse.normalize({
              role: 'user',
              content: finalUserContent
            });
          }

          else finalUserContent = {
            role: 'user',
            content: finalUserContent
          };
        }

        const messages = [
          ...history.slice(0, -1),
          selectedFramework === 'ollama'
            ? finalUserContent
            : { role: 'user', content: finalUserContent }
        ];

        prevChats.user.push(fullTextMessage);

        return selectedFramework === 'ollama'
          ? AiBackend.sendOllamaChat(messages, selectedModel)
          : AiBackend.sendOpenaiChat(messages, selectedModel);
      }

      catch(e) {
        throw e;
      }
    }

    else {
      prevChats.user.push(message);

      const messages = [
        ...history.slice(0, -1),
        { role: 'user', content: message }
      ];

      return selectedFramework === 'ollama'
        ? AiBackend.sendOllamaChat(messages, selectedModel)
        : AiBackend.sendOpenaiChat(messages, selectedModel);
    }
  },
}

export { AiResponse };
