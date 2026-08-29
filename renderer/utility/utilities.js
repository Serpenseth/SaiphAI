export const StringUtils = {
  getRawID(id) {
    const element = id.substring(id.lastIndexOf('-') + 1);
    return !element ? id.substring(id?.id.lastIndexOf('-') + 1) : element;
  },
}
