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

  // Captures the line number, action, and content of a diff line
  // Group 1: Start line number (optional)
  // Group 2: End line number (optional)
  // Group 3: Action (+, -, or nothing)
  // Group 4: The rest of the line
  const regex = /^(\d+)?\s*(\d+)?\s*\|\s*([-+])?(.*)$/;

  lines.forEach((line) => {
    if (line.startsWith(diffStartToken)) {
      currentFile = line.slice(diffStartToken.length).trim();
      console.log(`Parsing diff for file: ${currentFile}`);
    } else if (currentFile && line) {
      const match = line.match(regex);

      if (!match) {
        console.error(`Skipping line. Unexpected token: ${line}`);
        return;
      }

      const oldLineNumber = parseInt(match[1]);
      const newLineNumber = parseInt(match[2]);
      const action = match[3];
      const content = match[4];

      if (action === "+") {
        if (!isNaN(oldLineNumber) || isNaN(newLineNumber)) {
          console.error(`Skipping line. New line number is missing: ${line}`);
          return;
        }
        const position = new vscode.Position(newLineNumber - 1, 0);
        textEdits.push(vscode.TextEdit.insert(position, content));
      }

      if (action === "-") {
        if (isNaN(oldLineNumber) || !isNaN(newLineNumber)) {
          console.error(`Skipping line. Old line number is missing: ${line}`);
          return;
        }
        const range = document.lineAt(oldLineNumber - 1).range;
        textEdits.push(vscode.TextEdit.delete(range));
      }
    }
  });

  return textEdits;
}
