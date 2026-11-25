const DiffsBlock = {
  parse(block) {
    let match;
    const regex = /<EXPLANATION>([\s\S]*?)<\/EXPLANATION>\s*<SEARCH>([\s\S]*?)<\/SEARCH>\s*<REPLACE>([\s\S]*?)<\/REPLACE>/gs;
    const blocks = [];

    while ((match = regex.exec(block)) !== null) {
      blocks.push({
        explanation: match[1],
        search: match[2],
        replace: match[3],
      });
    }
    return blocks;
  },
}

export { DiffsBlock };
