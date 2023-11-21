import { Foundry } from "./foundry";
import * as vscode from "vscode";
import { executeCommand } from "./bin";

class ParseError extends Error {
  constructor(message: string) {
    super(message);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

const EMPTY_TEXT_EDITS: vscode.TextEdit[] = [];

export async function parseAndFormat(
  foundry: Foundry,
  document: vscode.TextDocument
): Promise<vscode.TextEdit[]> {
  return await _parseAndFormat(foundry, document);
}
async function _parseAndFormat(
  foundry: Foundry,
  document: vscode.TextDocument
): Promise<vscode.TextEdit[]> {
  try {
    const path = document.fileName;
    const cmd = `"${foundry.forgeBinaryPath}" fmt "${path}" --check`;
    const { stdout, exitCode } = await executeCommand(cmd);

    /**
     * Exit codes:
     * 0: No diffs found, no formatting required.
     * 1: Formatting required.
     * @see https://github.com/foundry-rs/foundry/blob/master/crates/forge/bin/cmd/fmt.rs#L34
     */
    if (exitCode === 0) {
      return EMPTY_TEXT_EDITS;
    }

    const edits = parseDiff(stdout, document);
    if (edits.length === 0) {
      throw new ParseError(
        "Parsing failed. Forge returned an exit code of 1 but no diffs were found."
      );
    }

    console.log(`Diffs: ${edits.length} in ${path}`);
    return edits;
  } catch (error) {
    console.error("Formatting failed with error: ", error);

    let message =
      "Formatting failed. Check `Extension Host` logs in VSCode for more details.";
    if (error instanceof ParseError) {
      message = error.message;
    }

    vscode.window.showErrorMessage(message);
    throw error; // Rethrow for caller
  }
}

function parseDiff(
  diff: string,
  document: vscode.TextDocument
): vscode.TextEdit[] {
  const diffStartToken = "Diff in ";
  let currentFile: string | null = null;

  const lines = diff.split("\n");
  const textEdits: vscode.TextEdit[] = [];

  // Captures the line number, action, and content of a diff line
  // Group 1: Start line number (optional)
  // Group 2: End line number (optional)
  // Group 3: Action (+, -, or nothing)
  // Group 4: The rest of the line
  const regex = /^(\d+)?\s*(\d+)?\s*\|([-+])?(.*)?/;

  for (const line of lines) {
    if (line.startsWith(diffStartToken)) {
      currentFile = line.slice(diffStartToken.length).trim();
      console.log(`Parsing diff for file: ${currentFile}`);
    } else if (currentFile && line) {
      const match = line.match(regex);

      if (!match) {
        throw new ParseError(`Unable to parse diff line: ${line}`);
      }

      const oldLineNumber = parseInt(match[1]);
      const newLineNumber = parseInt(match[2]);
      const action = match[3];
      const content = match[4];

      if (action === "+") {
        if (!isNaN(oldLineNumber) || isNaN(newLineNumber)) {
          throw new ParseError(`Unable to parse diff line: ${line}`);
        }
        const position = new vscode.Position(newLineNumber - 1, 0);
        textEdits.push(vscode.TextEdit.insert(position, content));
        continue;
      }

      if (action === "-") {
        if (isNaN(oldLineNumber) || !isNaN(newLineNumber)) {
          throw new ParseError(`Unable to parse diff line: ${line}`);
        }
        const range = document.lineAt(oldLineNumber - 1).range;
        textEdits.push(vscode.TextEdit.delete(range));
        continue;
      }
    }
  }

  return textEdits;
}
