import * as vscode from "vscode";
import { minimatch } from "minimatch";
import { publisher, name } from "../package.json";

/**
 * The default section name for the extension configuration. This is the publisher and name in package.json.
 */
export const DEFAULT_SECTION_NAME = `${publisher}.${name}`;

/**
 * The extension configuration.
 */
export class ForgeFormatConfig {
  /**
   * Globs to be included to be formatted. If `undefined` or `[]`, all paths will be considered for formatting as long as the files match `**\/*.sol`
   */
  includeGlobs?: string[];
  /**
   * Globs to be excluded from formatting. If `undefined` or `[]`, no paths will be excluded.
   */
  excludeGlobs?: string[];
  /**
   * Whether to save the file after formatting.
   */
  saveAfterFormat?: boolean;
  /**
   * Whether to close the document after saving.
   */
  closeAfterSave?: boolean;
  /**
   * The workspace configuration.
   */
  workspace?: Workspace;
}

/**
 * Workspace configuration.
 */
export interface Workspace {
  /**
   * Whether to automatically detect the workspace root. We find this by looking at `vscode.workspace.workspaceFolders` and grabbing the first index.
   */
  automatic?: boolean;
  /**
   * The workspace root to use. If `overrideRoot` and `automatic` is `true`, `overrideRoot` will be used.
   */
  overrideRoot?: string;
}

/**
 * The keys of the extension configuration.
 */
export type ConfigKey = keyof ForgeFormatConfig;

/**
 * The editor configuration. These settings are derived from the VS Code default settings. If you want to change these, you can do so in your VS Code settings.
 * This extension will not override these settings. If you want to change these settings, you can do so in your VS Code settings.
 * @see https://code.visualstudio.com/docs/getstarted/settings#_default-settings
 */
export type EditorConfig = {
  formatOnSave?: boolean;
};

export function initializeDefaults() {
  // TODO: Would be useful to find a `foundry.toml` and parse it to get sensible defaults
  // for the configuration depending on the environment this extension is ran in.
  setDefaultConfig("saveAfterFormat", true);
  setDefaultConfig("closeAfterSave", false);

  setDefaultConfig("includeGlobs", ["**/*.sol"]);
  setDefaultConfig("excludeGlobs", [
    "node_modules/**",
    "lib/**",
    "out/**",
    "cache/**",
    ".github/**",
    ".vscode/**",
  ]);

  setDefaultConfig("workspace", {
    automatic: true,
  });
}

/**
 * Gets the configuration value for the given key.
 * @param name The key to get the configuration value for.
 * @returns The configuration value for the given key.
 */
export function getConfig<T extends ConfigKey>(name: T): ForgeFormatConfig[T] {
  return vscode.workspace
    .getConfiguration(DEFAULT_SECTION_NAME)
    .get(name) as ForgeFormatConfig[T];
}

/**
 * Sets the configuration value for the given key.
 * @param name The key to set the configuration value for.
 * @param value The value to set the configuration to.
 * @returns A promise that resolves when the configuration has been set.
 */
export function setConfig<T extends ConfigKey>(
  name: T,
  value: ForgeFormatConfig[T]
): Thenable<void> {
  return vscode.workspace
    .getConfiguration(DEFAULT_SECTION_NAME)
    .update(name, value, true);
}

/**
 * Sets the configuration value for the given key if it is not already set.
 * @param name The key to set the configuration value for.
 * @param value The value to set the configuration to.
 * @returns A promise that resolves when the configuration has been set.
 */
function setDefaultConfig<T extends ConfigKey>(
  name: T,
  value: ForgeFormatConfig[T]
): Thenable<void> {
  return getConfig(name) === undefined
    ? setConfig(name, value)
    : Promise.resolve();
}

/**
 * Check if a URI matches any of the include glob patterns.
 * @param uri - The URI to check.
 * @param includeGlobs - Array of include glob patterns.
 * @returns `true` iff the URI is included.
 */
export function isUriIncluded(uri: vscode.Uri): boolean {
  const filePath = vscode.workspace.asRelativePath(uri);
  let includeGlobs = getConfig("includeGlobs");
  if (!includeGlobs || includeGlobs.length === 0) {
    includeGlobs = ["**/*.sol"];
  }

  return includeGlobs.some((pattern) => minimatch(filePath, pattern));
}

/**
 * Check if a URI matches any of the exclude glob patterns.
 * @param uri - The URI to check.
 * @param excludeGlobs - Array of exclude glob patterns.
 * @returns `true` iff the URI is excluded.
 */
export function isUriExcluded(uri: vscode.Uri): boolean {
  const filePath = vscode.workspace.asRelativePath(uri);
  const excludeGlobs = getConfig("excludeGlobs");
  if (!excludeGlobs || excludeGlobs.length === 0) {
    return false;
  }

  return excludeGlobs.some((pattern) => minimatch(filePath, pattern));
}

/**
 * Gets the editor configuration.
 * @returns The editor configuration.
 */
export function getEditorConfig(): EditorConfig {
  return vscode.workspace.getConfiguration("editor", null) as EditorConfig;
}

/**
 * Gets the workspace path. If the workspace path cannot be determined, `undefined` will be returned.
 * @returns The workspace path.
 */
export function getWorkspacePath(): string | undefined {
  const workspace = getConfig("workspace");

  if (workspace) {
    const { overrideRoot, automatic } = workspace;

    if (overrideRoot && automatic) {
      console.warn(
        "Both automatic workspace root detection and override workspace root are enabled. Override workspace root will be used."
      );
    }

    if (overrideRoot) {
      console.log(`Using override workspace root: ${overrideRoot}`);
      return overrideRoot;
    }

    if (!automatic) {
      console.log(
        "Workspace root detection disabled. Formatting will proceed using default Foundry settings unless a global Foundry configuration exists."
      );
      return undefined;
    }
  }

  const path = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!path) {
    vscode.window.showWarningMessage(
      "Unable to determine if you're within a workspace. Formatting will proceed using default Foundry settings unless a global Foundry configuration exists."
    );
  }

  console.log(`Workspace path: ${path}`);
  return path;
}
