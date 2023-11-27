import * as cp from "child_process";
import * as path from "path";
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from "@vscode/test-electron";

async function main() {
  try {
    // The root path of the extension. Location of `node_modules` and `package.json`
    // Passed to `process.env.extensionRootPath`
    const extensionRootPath = path.resolve(__dirname, "../../../");

    // The folder containing test fixtures.
    // Passed to `process.env.extensionTextFixturesPath`
    const extensionTextFixturesPath = path.resolve(
      extensionRootPath,
      "./test-fixtures"
    );

    // The folder containing the Extension Manifest package.json. This is the path after build.
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    // The environment of each test
    const environment = {
      extensionRootPath: extensionRootPath,
      extensionTextFixturesPath: extensionTextFixturesPath,
    };

    // Download vscode and unzip it. We need to install language support in order to properly test our extension
    const vscodeExecutablePath = await downloadAndUnzipVSCode("stable");
    const [cliPath, ...args] =
      resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

    // Install required third-party extensions
    // TODO: We should probably include any third-party extensions required for tests as a flat-file fixture just incase they
    // are removed from the marketplace.
    cp.spawnSync(
      cliPath,
      [...args, "--install-extension", "tintinweb.vscode-solidity-language"],
      {
        encoding: "utf-8",
        stdio: "inherit",
      }
    );

    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      extensionTestsEnv: environment,
    });
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exit(1);
  }
}

main();
