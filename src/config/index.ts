import * as vscode from "vscode";
import { publisher, name } from "../../package.json";

/**
 * The default section name for the extension configuration. This is the publisher and name in package.json.
 */
export const DEFAULT_SECTION_NAME = `${publisher}.${name}`;

/**
 * The default configuration for the extension.
 */
const DEFAULT_CONFIG: ForgeFormatConfig = {
  workspace: {
    automatic: true,
  },
};

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
 * The extension configuration.
 */
export class ForgeFormatConfig {
  /**
   * Globs to be included to be formatted. If `undefined` or `[]`, all paths will be formatted.
   */
  includePaths?: string[];
  /**
   * Globs to be excluded from formatting. If `undefined` or `[]`, no paths will be excluded.
   */
  excludePaths?: string[];
  /**
   * The workspace configuration.
   */
  workspace?: Workspace;
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

/**
 * Gets the configuration value for the given key.
 * @param name The key to get the configuration value for.
 * @returns The configuration value for the given key.
 */
export function getConfig<T extends ConfigKey>(name: T): ForgeFormatConfig[T] {
  return vscode.workspace
    .getConfiguration(DEFAULT_SECTION_NAME)
    .get(name, DEFAULT_CONFIG[name]) as ForgeFormatConfig[T];
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
