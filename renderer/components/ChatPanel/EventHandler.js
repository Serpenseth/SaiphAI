import {
  StringUtils,
  DomQuery,
} from '../../utility/utilities.js';

import { FileHandler } from './WindowAPI.js';
import { Controller } from './Controller.js';
import { ResizeManager } from './ResizeManager.js';

import { FilePreview } from '../FilePreview.js';

const EventHandler = {
  setupShowPanelEvent(elems) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);
      elem.addEventListener('click', fn);
    });
  },

  setupInputEvent(element, fn, abortSignal) {
    const el = DomQuery.getElement(element);

    if (el) {
      el.addEventListener('keydown', fn, { signal: abortSignal });
    }
  },

  setupClickEvents(elems, abortSignal) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);

      if (elem) {
        // Check if new tab event is set
        if (elem.id === 'new-chat-tab') {
          const classes = Array.from(elem.classList);

          // Only register new-chat-tab event once
          if (!classes.includes('setup')) {
            elem.addEventListener('click', fn, { signal: abortSignal })
            DomQuery.setElementClass('new-chat-tab', 'setup');
          }
        }
        else {
          elem.addEventListener('click', fn, { signal: abortSignal });
        }
      }
    });
  },

  setupResizeHandleEvent(element, fn, abortSignal) {
    const el = DomQuery.getElement(element);

    if (el) {
      el.addEventListener('mousedown', (e) => {
        fn(e);
        // Only Attach global listeners after mousedown occurs
        window.addEventListener('mousemove', ResizeManager.resize);
        window.addEventListener('mouseup', ResizeManager.stopResize);
      }, { signal: abortSignal });
    }
  },

  setupResizeChatAreaEvent(element, fn, abortSignal) {
    const el = DomQuery.getElement(element);

    if (el) {
      el.addEventListener('mousedown', (e) => {
        fn(e);
        // Only Attach global listeners after mousedown occurs
        window.addEventListener('mousemove', ResizeManager.resizeChatArea);
        window.addEventListener('mouseup', ResizeManager.stopResizeChatArea);
      }, { signal: abortSignal });
    }
  },

  setupFilePreview(rawID, element, abortSignal) {
    const el = DomQuery.getElement(element);

    el.addEventListener('click', async () => {
      const selected = await FileHandler.openFileChooser();
      let fileArray;

      if (Array.isArray(selected)) {
        const fnames = selected.map(f => StringUtils.getFileName(f));
        const paths = selected.map(f => f.replace(StringUtils.getFileName(f), ''));

        fileArray = selected.map(f => {
          return {
            fileName: StringUtils.getFileName(f),
            filePath: f.replace(StringUtils.getFileName(f), ''),
            count: selected.length,
          };
        });
      }

      else {
        const fname = StringUtils.getFileName(selected);
        const path = selected.replace(fname, '');

        fileArray = [{
          fileName: fname ,
          filePath: path,
          count: 1,
        }]
      }

      FilePreview.init(rawID, fileArray);
    }, { signal: abortSignal });
  },

  setupModelSelectorEvent(selector, fn, abortSignal) {
    const sel = DomQuery.getElement(selector);
    sel.addEventListener('change', fn, { signal: abortSignal });
  },
}

export { EventHandler };
