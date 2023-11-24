import { getFoundry } from "./foundry";
import { parse } from "./formatter";
import { getConfig, getEditorConfig, initializeDefaults } from "./config";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const foundry = getFoundry();
  initializeDefaults();

  vscode.languages.registerDocumentRangeFormattingEditProvider(
    { scheme: "file", language: "solidity" },
    {
      async provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
      ): Promise<vscode.TextEdit[]> {
        return await parse(foundry, document, range);
      },
    }
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.languageId !== "solidity") {
        return;
      }
      if (!getEditorConfig().formatOnSave) {
        return;
      }
      parse(foundry, document).then((textEdits) => {
        const edit = new vscode.WorkspaceEdit();
        edit.set(document.uri, textEdits);
        vscode.workspace.applyEdit(edit).then(() => {
          if (getConfig("saveAfterFormat")) {
            document.save();
          }
        });
      });
    })
  );

  console.log("Forge Format VSC extension activated!");
}

export function deactivate() {
  // TODO: Clean up any resources/state, GC, etc, be responsible :)
  console.log("Forge Format VSC extension deactivated!");
}
