# Forge Format VSC

Welcome to the "Forge Format VSC" extension! This VSCode extension simplifies Solidity file formatting using Forge, a tool from Foundry. Easily format your Solidity files directly within the Visual Studio Code editor or utilize the right-click context menu for individual files or entire folders.

## Features

- **Forge Formatting:** Leverage the power of Forge from Foundry for efficient Solidity file formatting.
- **Context Menu Integration:** Conveniently format files or entire folders directly from the VSCode context menu.

## Requirements

- **Foundry:** Ensure that Foundry is installed on your machine. You can download it from [getfoundry.sh](https://getfoundry.sh/).

## Extension Settings

This extension provides several configuration options:

- **rmcmk.forge-format-vsc.includePaths:** A `string` array of globs to be included for formatting. If left undefined or empty, all paths will be formatted.
- **rmcmk.forge-format-vsc.excludePaths:** A `string` array of globs to be excluded from formatting. If left undefined or empty, no paths will be excluded.
- **rmcmk.forge-format-vsc.workspace:** Configure the workspace settings. It has two properties:
  - **rmcmk.forge-format-vsc.workspace.automatic:** A `boolean`. If set to `true`, the extension will automatically detect the workspace root by looking at `vscode.workspace.workspaceFolders` and grabbing the first index.
  - **rmcmk.forge-format-vsc.workspace.overrideRoot:** A `string`. Specify the workspace root to use. If both `overrideRoot` and `automatic` are true, `overrideRoot` will be used.

These settings can be adjusted in the VS Code settings.

## Editor Configuration

The extension also provides an editor configuration. These settings are derived from the VS Code default settings. If you want to change these, you can do so in your VS Code settings. This extension will not override these settings. 

- **editor.formatOnSave:** A `boolean`. If set to `true`, the extension will automatically format your files on save.

## Known Issues

- Formatting a range containing "invalid" Solidity, such as a snippet missing a closing bracket, may fail if Forge cannot construct a valid Parse Tree for the selected snippet.

If you come across any other issues, please refer to the [GitHub issues page](https://github.com/rmcmk/forge-format-vsc/issues) or report a new issue.

## Release Notes

### 1.0.0

- Initial release of "Forge Format VSC."

**Enjoy!**