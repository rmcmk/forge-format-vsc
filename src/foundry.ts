import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { homedir, isWindows } from "./os";

/**
 * The URL to the foundryup installation instructions.
 */
const FOUNDRYUP_INSTALL_INSTRUCTIONS =
  "https://github.com/foundry-rs/foundry/blob/master/foundryup/README.md";

/**
 * Metadata about the foundry installation.
 */
export type Foundry = {
  baseDir: string;
  foundryDir: string;
  foundryBinDir: string;
  forgeBinaryName: string;
  forgeBinaryPath: string;
};

/**
 * Gets the foundry installation and validates it.
 * @returns The foundry installation.
 * @throws If the foundry installation cannot be determined.
 */
export function getFoundry(): Foundry {
  const foundry = findFoundry();
  const { forgeBinaryPath } = foundry;

  try {
    // accessSync will throw an error if the file does not exist or is not executable
    fs.accessSync(forgeBinaryPath, fs.constants.F_OK | fs.constants.X_OK);
    console.log(`Forge binary found at: ${forgeBinaryPath}`);
  } catch (error) {
    const errorMessage = generateErrorMessage(forgeBinaryPath);
    vscode.window.showErrorMessage(errorMessage);
    throw error; // Rethrow for the caller to handle
  }

  return foundry;
}

/**
 * Constructs a path to the expected foundry installation. We check the same places as the installer does.
 * @see https://github.com/foundry-rs/foundry/blob/master/foundryup/foundryup#L4
 * @see https://github.com/foundry-rs/foundry/blob/master/foundryup/foundryup#L200
 * @returns Metadata about the foundry installation, preliminary to validation.
 */
function findFoundry(): Foundry {
  const homeDir = homedir();
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;

  const baseDir = xdgConfigHome || homeDir;
  const foundryDir = process.env.FOUNDRY_DIR || path.join(baseDir, ".foundry");
  const foundryBinDir = path.join(foundryDir, "bin");
  const forgeBinaryName = isWindows() ? "forge.exe" : "forge";
  const forgeBinaryPath = path.join(foundryBinDir, forgeBinaryName);

  return {
    baseDir,
    foundryDir,
    foundryBinDir,
    forgeBinaryName,
    forgeBinaryPath,
  };
}

/**
 * Generates an error message for the given forge binary path.
 * @param forgeBinaryPath The forge binary path.
 * @returns The error message.
 */
function generateErrorMessage(forgeBinaryPath: string): string {
  let message = `Unable to locate or execute the Forge binary at: '${forgeBinaryPath}'.`;

  if (!fs.existsSync(forgeBinaryPath)) {
    message += " Please confirm that Foundry is installed correctly.";
  } else {
    message +=
      " The file exists but cannot be executed. Ensure you have the correct permissions.";
    if (!isWindows()) {
      // On Windows, the execute permission is not usually a concern.
      message +=
        " On Unix-like systems, this can typically be fixed by setting the executable flag via 'chmod +x'.";
    }
  }

  message += ` If Foundry is installed in a non-standard location, set the 'FOUNDRY_DIR' environment variable correctly.`;
  message += ` For installation instructions or to download Foundry, please visit ${FOUNDRYUP_INSTALL_INSTRUCTIONS}.`;

  return message;
}
