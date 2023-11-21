import { Foundry } from "./foundry";
import * as vscode from "vscode";
import { executeCommand } from "./bin";

const EMPTY_TEXT_EDITS: vscode.TextEdit[] = [];

export async function parseAndFormat(
  foundry: Foundry,
  document: vscode.TextDocument
): Promise<vscode.TextEdit[]> {
  const textEdits = await _parseAndFormat(foundry, document);
  if (textEdits.length === 0) {
    vscode.window.showInformationMessage("No formatting changes detected.");
  }
  return textEdits;
}
async function _parseAndFormat(
  foundry: Foundry,
  document: vscode.TextDocument
): Promise<vscode.TextEdit[]> {
  try {
    const path = document.fileName;
    const cmd = `"${foundry.forgeBinaryPath}" fmt "${path}" --check`;
    const { stdout, exitCode } = await executeCommand(cmd);

    if (exitCode === 0) {
      return EMPTY_TEXT_EDITS;
    }

    const edits = parseDiff(stdout, document);
    if (edits.length === 0) {
      return EMPTY_TEXT_EDITS;
    }

    console.log(`Diffs: ${edits.length} in ${path}`);

    return edits;
  } catch (error) {
    console.error("Formatting failed with error: ", error);
    vscode.window.showErrorMessage(
      "Formatting failed. Please check the formatter settings and path. See the console for more details."
    );
  }

  return EMPTY_TEXT_EDITS;
}

function parseDiff(
  diff: string,
  document: vscode.TextDocument
): vscode.TextEdit[] {
  const diffStartToken = "Diff in ";
  let currentFile: string | null = null;

  const lines = diff.split("\n");

  const textEdits: vscode.TextEdit[] = [];

  lines.forEach((line) => {
    if (line.startsWith(diffStartToken)) {
      currentFile = line
        .substring(diffStartToken.length, line.length - 1)
        .trim();
      console.log(`Parsing diff for file: ${currentFile}`);
    } else if (currentFile && line) {
      // Extracts all metadata from the diff, including the lines content
      const metadataLastIndex = line.indexOf("|") + 2;

      // Extract the metadata from this diff. The metadata is in the format:
      // <line number>|<action> and the content always follows after the metadata on the same line.
      // The metadata is always at the start of the line, so we can extract it
      // The metadata can also contain leading, trailing and arbitrary whitespace so we must remove it
      const metadata = line
        .substring(0, metadataLastIndex)
        .replaceAll(/\s/g, "")
        .split("|");
      const lineNumber = parseInt(metadata[0]);
      const action = metadata[1];
      const content = line.substring(metadataLastIndex);

      const position = new vscode.Position(lineNumber - 1, 0);
      const range = document.lineAt(lineNumber - 1).range;

      if (action === "+") {
        textEdits.push(vscode.TextEdit.insert(position, content));
      } else if (action === "-") {
        textEdits.push(vscode.TextEdit.delete(range));
      }
    }
  });

  return textEdits;
}
