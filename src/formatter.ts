import { Foundry } from "./foundry";
import * as vscode from "vscode";
import { executeCommand } from "./bin";
import { getWorkspacePath } from "./config";

class ParseError extends Error {
  constructor(message: string) {
    super(message);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

// Captures the line number, action, and content of a diff line
// Group 1: Start line number (optional)
// Group 2: End line number (optional)
// Group 3: Action (+, -, or nothing)
// Group 4: The rest of the line
const DIFF_REGEX = /^(\d+)?\s*(\d+)?\s*\|([-+])?(.*)?/;

const EMPTY_TEXT_EDITS: vscode.TextEdit[] = [];

export async function parse(
  foundry: Foundry,
  document: vscode.TextDocument,
  range?: vscode.Range
): Promise<vscode.TextEdit[]> {
  return await _parse(foundry, document, range);
}
async function _parse(
  foundry: Foundry,
  document: vscode.TextDocument,
  range?: vscode.Range
): Promise<vscode.TextEdit[]> {
  try {
    const workspace = getWorkspacePath();

    // If no range is provided, assume the entire document
    if (!range) {
      range = new vscode.Range(
        0,
        0,
        document.lineCount - 1,
        document.lineAt(document.lineCount - 1).range.end.character
      );
    }

    const text = document.getText(range);
    const { stdout, exitCode } = await executeCommand(
      foundry.forgeBinaryPath,
      ["fmt", "-", "--check"],
      text,
      workspace
    ).catch((error) => {
      throw new ParseError(`Formatting failed: ${error}`);
    });

    /**
     * Exit codes:
     * 0: No diffs found, no formatting required.
     * 1: Formatting required.
     * @see https://github.com/foundry-rs/foundry/blob/master/crates/forge/bin/cmd/fmt.rs#L34
     */
    if (exitCode === 0) {
      return EMPTY_TEXT_EDITS;
    }

    const edits = parseDiff(stdout, document, range);
    if (edits.length === 0) {
      throw new ParseError(
        "Parsing failed. Forge returned an exit code of 1 but no diffs were found."
      );
    }

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
  document: vscode.TextDocument,
  range: vscode.Range
): vscode.TextEdit[] {
  // The input can be from a file or stdin.
  // If it is from a file, the first line will be "Diff in <filename>:"
  // If it is from stdin, the first line will be "Diff in stdin:"
  let inputFrom: string | null = null;
  const diffStartToken = "Diff in ";

  const lines = diff.split("\n");
  const textEdits: vscode.TextEdit[] = [];

  const startLine = range.start.line;

  for (const line of lines) {
    if (line.startsWith(diffStartToken)) {
      inputFrom = line.slice(diffStartToken.length - 1).trim();
      console.log(`Parsing diff from: ${inputFrom}`);
    } else if (inputFrom && line) {
      const match = line.match(DIFF_REGEX);

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
        const position = new vscode.Position(startLine + newLineNumber - 1, 0);
        textEdits.push(vscode.TextEdit.insert(position, content));
      } else if (action === "-") {
        if (isNaN(oldLineNumber) || !isNaN(newLineNumber)) {
          throw new ParseError(`Unable to parse diff line: ${line}`);
        }
        const range = document.lineAt(startLine + oldLineNumber - 1).range;
        textEdits.push(vscode.TextEdit.delete(range));
      }
    }
  }

  return textEdits;
}
