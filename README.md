# Forge Format VSC - Simplify Solidity Formatting in Visual Studio Code

Welcome to the Forge Format VSC extension! Streamline the formatting of your Solidity files with ease using Forge, a powerful tool from Foundry. This Visual Studio Code (VSCode) extension seamlessly integrates Forge into the VSCode formatter API, allowing efficient formatting of Solidity code directly within the editor.

## Key Features

- **Forge Formatting Integration:** Harness the capabilities of Forge from Foundry for quick and efficient Solidity file formatting.
  - Integrated seamlessly into VSCode's powerful formatter API, seamlessly working with default VSCode commands.
  - Utilize shortcuts like alt+shift+f for entire file formatting and cmd+k + cmd+f (or ctrl+k + ctrl+f) for formatting specific code ranges or snippets.
  - Right-click inside a document for "format document" support.

- **Context Menu Integration:** (Coming soon™) Easily format individual files or entire folders directly from the VSCode context menu.

## Requirements

- **Foundry:** Ensure that Foundry is installed on your machine. Download it from [getfoundry.sh](https://getfoundry.sh/).

## Extension Settings

Tailor the extension to your preferences with the following configuration options:

- **Include and Exclude Globs:** Define globs for files to include or exclude from formatting.
- **Auto-Save and Auto-Close:** Choose whether formatted files are automatically saved and closed after formatting.
- **Workspace Configuration:** Customize workspace settings for automatic detection or specify a root override.

Adjust these settings in the VSCode settings menu.

## Editor Configuration

Forge Format VSC respects your editor configuration. Control automatic formatting on save and set the default formatter to "rmcmk.forge-format-vsc" in your VSCode settings.

## Known Issues

- Formatting a range with "invalid" Solidity, such as a snippet missing a closing bracket, may fail if Forge cannot construct a valid Parse Tree.

If you encounter any issues, please refer to the [GitHub issues page](https://github.com/rmcmk/forge-format-vsc/issues) or report a new issue.

## Release Notes

### 1.1.0
- Format code ranges/snippets within a document using VSCode's built-in range formatter.
- Ability to pipe code into Forge from the editor's buffer, enabling formatting of dirty files with pending changes.
- Shifted from parsing diffs directly from Forge to generating custom diffs using the `jsdiff` library and raw formatted output from Forge. This change enhances integration with Visual Studio Code's TextEdit API, offering improved control over text edits within the editor.
- New Settings:
  - Implementation of `includeGlobs` and `excludeGlobs`.
  - Options for saving and closing files after formatting.

### 1.0.1
- Improved parsing of Forge's diff output.
- Correct handling of unmodified lines.
- Enhanced tokenization of the diff for more reliable output across OS.
- Fail-fast mechanism for impossible formatting.
- Proper implementation of `editor.formatOnSave`.
- Improved default settings for a consistent out-of-the-box experience.
- Settings UI implementation for user-friendly configuration.

### 1.0.0

- Initial release of "Forge Format VSC."

**Enjoy effortless Solidity formatting with Forge in VSCode!**