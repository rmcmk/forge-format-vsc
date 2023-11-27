import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";

const EXTENSION_ID = "rmcmk.forge-format-vsc";

suite("Forge Format VSC", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("ensure the extension exists and is not active by default", () => {
    const extension = getExtension();
    assert.strictEqual(
      extension.isActive,
      false,
      "Extension is active. Should not be active by default."
    );
  });

  test("ensure the extension is active after recognizing a Solidity file within the editor", async () => {
    const extension = getExtension();
    const solidityFile = vscode.Uri.file(
      `${process.env.extensionTextFixturesPath}/ContractDefinition/original.sol`
    );
    const document = await vscode.workspace.openTextDocument(solidityFile);

    // We must `showTextDocument` to trigger activation events. Programmatically `openTextDocument` does not trigger activation events.
    await vscode.window.showTextDocument(document);

    // Wait for any activation events to be consumed. This is necessary because the extension is activated asynchronously.
    // We will wait a maximum of 60 seconds for the extension to activate before failing the test.
    await waitForExtensionActivation(extension);

    assert.strictEqual(
      extension.isActive,
      true,
      "Extension should be active after recognizing a Solidity file."
    );
  });

  test("Test format", async () => {
    const root = `${process.env.extensionTextFixturesPath}/ContractDefinition`;
    const dirtyDocument = await vscode.workspace.openTextDocument(
      `${root}/original.sol`
    );
    const formatted = fs.readFileSync(`${root}/fmt.sol`, "utf8");
    await vscode.window.showTextDocument(dirtyDocument);
    await vscode.commands.executeCommand("editor.action.formatDocument");
    assert.equal(dirtyDocument.getText(), formatted);
  });
});

function getExtension(): vscode.Extension<any> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, "Extension is not found");
  return extension!;
}

function waitForExtensionActivation(
  extension?: vscode.Extension<any>
): Promise<void> {
  return new Promise<void>((resolve) => {
    const intervalId = setInterval(() => {
      if (extension && extension.isActive) {
        clearInterval(intervalId);
        resolve();
      }
    }, 100);
  });
}
