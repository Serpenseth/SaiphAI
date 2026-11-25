const ModelsObject = {
  handle(modelObject) {
    const modelNames = [];
    modelObject.forEach(({ name }) => modelNames.push(name));

    return modelNames;
  },
}

export { ModelsObject };
