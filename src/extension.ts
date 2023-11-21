import { getFoundry } from "./foundry";
import { parse } from "./formatter";
import { getEditorConfig } from "./config";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const foundry = getFoundry();

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
        // If the document is dirty, we don't want to apply the edits.
        // In between parsing and applying the edits, the user may have made changes to the document.
        if (document.isDirty) {
          return;
        }

        const edit = new vscode.WorkspaceEdit();
        edit.set(document.uri, textEdits);
        vscode.workspace.applyEdit(edit).then(() => {
          document.save(); // Be sure to save the document after applying the edits.
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
