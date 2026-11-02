const suggestEditPrompt = `The user wants to modify the contents of a file.

  ANALYSIS STEP:
  First read the REFERENCE FILE CONTENTS.
  Second, using the REFERENCE FILE CONTENTS,
  evaluate whether the user's instructions are clear and actionable
  in the context of the selected content. If the instructions are:
  - Nonsensical, random, or unrelated to the content
  - Ambiguous with multiple valid interpretations:

  then output a <CLARIFY> block asking the user to clarify their intent in no more than three sentences.
  **ALWAYS** refer to the user as you.
  **You are forbidden from outputing a SEARCH/REPLACE block if you are not confident about
  what change(s) to make.**

  If the instructions are clear and actionable, output one or more
  SEARCH/REPLACE blocks in this exact format:

  <EXPLANATION>
  One or two sentences describing WHAT this change does and WHY it improves the code or content.
  </EXPLANATION>
  <SEARCH>
  exact code or content to find, including whitespace
  </SEARCH>
  <REPLACE>
  new code or content to replace it with
  </REPLACE>

  Rules:
  - The SEARCH text must match exactly what is in the file
  - Every SEARCH/REPLACE pair must be preceded by an EXPLANATION block
  - Only output the blocks, no prose outside them
  - Never write any text between </SEARCH> and <REPLACE> or between consecutive block pairs
  - If no changes are needed, say "NO_CHANGES"
`;

export { suggestEditPrompt };
