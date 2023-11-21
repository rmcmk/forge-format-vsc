import { getFoundry } from "./foundry";
import { parseAndFormat } from "./formatter";
import { getEditorConfig } from "./config";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const foundry = getFoundry();

  vscode.languages.registerDocumentFormattingEditProvider(
    { scheme: "file", language: "solidity" },
    {
      async provideDocumentFormattingEdits(
        document: vscode.TextDocument
      ): Promise<vscode.TextEdit[]> {
        return parseAndFormat(foundry, document);
      },
    }
  );

  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event) => {
      const document = event.document;
      if (
        document.languageId === "solidity" && getEditorConfig().formatOnSave
      ) {
        event.waitUntil(parseAndFormat(foundry, document));
      }
    })
  );

  console.log("Forge Format VSC extension activated!");
}

export function deactivate() {
  // TODO: Clean up any resources/state, GC, etc, be responsible :)
  console.log("Forge Format VSC extension deactivated!");
}
