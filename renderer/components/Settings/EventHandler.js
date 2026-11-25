import { DomQuery } from '../../utility/utilities.js';

const EventHandler = {
  setupClickEvents(elems, fn) {
    elems.forEach(({ id, fn }) => {
      const elem = DomQuery.getElement(id);

      if (elem)
        elem.addEventListener('click', fn);
    });
  },

  setupKeyPressEvent(fn) {
    document.addEventListener('keydown', fn);
  },
}

export { EventHandler };
