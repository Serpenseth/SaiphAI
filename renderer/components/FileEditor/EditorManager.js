const EditorManager = {
  editorElements: new Map(),

  set(id, data) {
    EditorManager.editorElements.set(id, {
      fileEditorElement: data.fileEditorElement,
      monacoInstance: data.monacoInstance,
      monacoHighlighter: data.monacoHighlighter,
    });
  },

  get(id) {
    return EditorManager.editorElements.get(id);
  },

  remove(id) {
    const data = EditorManager.editorElements.get(id);
    // First destroy monaco editor instance and highlighter
    data.monacoInstance.dispose();
    data.monacoHighlighter.destroy();
    // Then delete map entry
    EditorManager.editorElements.delete(id);
  },

  getByElementID(DomElement) {
    let allElements = Array.from(EditorManager.editorElements.values());
    allElements = allElements.flat();

    allElements.forEach(el => {
      if (el.id === DomElement.id)
        return el;
    });
  },
}

export { EditorManager };
