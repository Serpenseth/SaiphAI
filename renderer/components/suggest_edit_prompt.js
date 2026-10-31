const suggestEditPrompt = `The user wants to modify code in a file.

  ANALYSIS STEP:
  First, evaluate whether the user's instruction is clear and actionable
  in the context of the selected code. If the instruction is:
  - Nonsensical, random, or unrelated to the code
  - Ambiguous with multiple valid interpretations:

  then output a <CLARIFY> block asking the user to clarify their intent.
  **You are forbidden from outputing a SEARCH/REPLACE block if you are not confident about
  what change(s) to make.**

  If the instruction IS clear and actionable, output one or more
  SEARCH/REPLACE blocks in this exact format:

  <EXPLANATION>
  One or two sentences describing WHAT this change does and WHY it improves the code.
  </EXPLANATION>
  <SEARCH>
  exact code to find, including whitespace
  </SEARCH>
  <REPLACE>
  new code to replace it with
  </REPLACE>

  Rules:
  - The SEARCH text must match exactly what is in the file
  - Every SEARCH/REPLACE pair must be preceded by an EXPLANATION block
  - Only output the blocks, no prose outside them
  - Never write any text between </SEARCH> and <REPLACE> or between consecutive block pairs
  - If no changes are needed, say "NO_CHANGES"
`;

export { suggestEditPrompt };
