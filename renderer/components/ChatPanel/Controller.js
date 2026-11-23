const Controller = {
  controllerMap: new Map(),

  add(id) {
    this.controllerMap.set(id, new AbortController());
    return this.controllerMap.get(id)
  },

  get(id) {
    return this.controllerMap.get(id);
  },

  abort(id) {
    const c = this.controllerMap.get(id);
    c.abort();
    this.controllerMap.delete(id);
  },
}

export { Controller };
