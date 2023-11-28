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
const NO_NEWLINE_INDICATOR = `\\\\ No newline at end of file`;

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
  fileName: string,
  text: string,
  range: vscode.Range
): vscode.TextEdit[] {
  // Create a patch and parse it from the Forge stdout and the original content of the TextDocument
  const parsedDiff: diff.ParsedDiff[] = diff.parsePatch(
    diff.createPatch(fileName, text, stdout)
  );

  const textEdits: vscode.TextEdit[] = [];

  for (const file of parsedDiff) {
    for (const hunk of file.hunks) {
      const trailingTokens =
        hunk.lines.length - (hunk.newLines + hunk.oldLines);
      const oldLinesTotal = hunk.oldLines;
      const oldStartLine = hunk.oldStart;
      const oldEndLine = oldStartLine + oldLinesTotal;
      const oldLines = hunk.lines.slice(oldStartLine - 1, oldEndLine - 1);

      const newLinesTotal = hunk.newLines;
      const newStartLine = oldLinesTotal + (hunk.newStart + trailingTokens);
      const newEndLine = oldLinesTotal + newLinesTotal;
      const newLines = hunk.lines.slice(newStartLine - 1); // Grab all remaining lines for the new content

      // console.log(`oldLinesTotal: ${oldLinesTotal} | oldStartLine: ${oldStartLine} | oldEndLine: ${oldEndLine} | oldLines: ${oldLines.join("\n")}`)
      // console.log(`newLinesTotal: ${newLinesTotal} | newStartLine: ${newStartLine} | newEndLine: ${newEndLine} | newLines: ${newLines.join("\n")}`);

      // Check if a newline needs to be added to the end of the file
      if (newLines[newLines.length - 1] === NO_NEWLINE_INDICATOR) {
        // Remove the 'no newline' indicator
        newLines.pop();
      } else {
        // If the last line in the file is not a 'no newline' indicator, add a newline
        newLines.push("+");
      }

      textEdits.push(
        vscode.TextEdit.replace(
          range,
          newLines.map((line) => line.slice(1)).join("\n") // Slice the first character (diff indicator: +, -, \s) from each line
        )
      );
    }
  }

  return textEdits;
}
