import { exec } from "child_process";
import { getWorkspacePath } from "./config";

/**
 * Executes a command in the workspace root.
 * @param cmd The command to execute.
 * @returns A promise that resolves with the command's stdout and exit code.
 */
export function executeCommand(
  cmd: string
): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      {
        cwd: getWorkspacePath(),
      },
      (error, stdout, stderr) => {
        const exitCode = error ? error.code || 1 : 0;
        console.log(`Command executed with exit code ${exitCode}`);
        resolve({ stdout, exitCode });
      }
    );
  });
}
