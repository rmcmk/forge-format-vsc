import { Foundry } from "./foundry";
import * as vscode from "vscode";
import { executeCommand } from "./bin";
import { getWorkspacePath, isUriExcluded, isUriIncluded } from "./config";
import * as diff from "diff";

class ParseError extends Error {
  constructor(message: string) {
    super(message);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

const EMPTY_TEXT_EDITS: vscode.TextEdit[] = [];

export async function parse(
  foundry: Foundry,
  document: vscode.TextDocument,
  range: vscode.Range
): Promise<vscode.TextEdit[]> {
  try {
    const uri = document.uri;
    if (!isUriIncluded(uri)) {
      throw new ParseError(`File is not included: ${uri}`);
    }

    if (isUriExcluded(uri)) {
      throw new ParseError(`File is excluded: ${uri}`);
    }

    const workspace = getWorkspacePath();
    const text = document.getText(range);
    const { stdout, exitCode } = await executeCommand(
      foundry.forgeBinaryPath,
      ["fmt", "-", "--raw", "--check"],
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

    const edits = parseChanges(stdout, document, range);
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

function parseChanges(
  stdout: string,
  document: vscode.TextDocument,
  range: vscode.Range
): vscode.TextEdit[] {
  const changes = diff.diffLines(document.getText(range), stdout);
  const textEdits: vscode.TextEdit[] = [];

  let lineNumber = range.start.line;
  let charNumber = range.start.character;
  let newText = "";

  changes.forEach((part) => {
    if (part.added) {
      newText += part.value;
    } else if (part.removed) {
      const start = new vscode.Position(lineNumber, charNumber);
      const end = new vscode.Position(
        lineNumber + (part.count || 1) - 1,
        charNumber + part.value.length - 1
      );
      textEdits.push(vscode.TextEdit.delete(new vscode.Range(start, end)));
    } else {
      charNumber += part.value.length;
    }

    // Update line and char numbers
    const lines = part.value.split("\n");
    lineNumber += lines.length - 1;
    charNumber = lines.length > 1 ? lines[lines.length - 1].length : charNumber;
  });

  // Insert new content at the beginning of the range
  if (newText.length > 0) {
    const position = new vscode.Position(
      range.start.line,
      range.start.character
    );
    textEdits.push(vscode.TextEdit.insert(position, newText));
  }

  return textEdits;
}
