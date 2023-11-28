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
      ["fmt", "-", "--check", "--raw"],
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

    const edits = parseChanges(stdout, document.fileName, text, range);
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
  source: string,
  text: string,
  range: vscode.Range
): vscode.TextEdit[] {
  const parsedDiff: diff.ParsedDiff[] = diff.parsePatch(
    diff.createPatch(source, text, stdout)
  );
  const textEdits: vscode.TextEdit[] = [];

  let currentLine = range.start.line;
  for (const file of parsedDiff) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        const start = new vscode.Position(currentLine, 0);

        if (line.startsWith("+")) {
          textEdits.push(
            vscode.TextEdit.insert(start, line.slice(1)) // Add everything but the '+' character
          );
        } else if (line.startsWith("-")) {
          const end = new vscode.Position(currentLine, line.length - 1); // Remove everything but the '-' character
          textEdits.push(vscode.TextEdit.delete(new vscode.Range(start, end)));
          currentLine--;
        }

        currentLine++;
      }
    }
  }

  return textEdits;
}
