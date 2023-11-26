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
        return await parse(foundry, document, range).finally(() => {
          maybeSaveAndClose(document);
        });
      },
    }
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (
        document.languageId === "solidity" &&
        getEditorConfig().formatOnSave &&
        getConfig("saveAfterFormat") &&
        getConfig("closeAfterSave")
      ) {
        vscode.commands.executeCommand("workbench.action.closeActiveEditor");
      }
    })
  );

  console.log("Forge Format VSC extension activated!");
}

function maybeSaveAndClose(document: vscode.TextDocument) {
  if (document.isDirty && !document.isClosed && getConfig("saveAfterFormat")) {
    document.save().then((saved) => {
      if (saved && getConfig("closeAfterSave")) {
        vscode.commands.executeCommand("workbench.action.closeActiveEditor");
      }
    });
  }
}

export function deactivate() {
  // TODO: Clean up any resources/state, GC, etc, be responsible :)
  console.log("Forge Format VSC extension deactivated!");
}
