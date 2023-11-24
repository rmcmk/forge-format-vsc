import { spawn, ChildProcess } from "child_process";
import { getWorkspacePath } from "./config";

/**
 * Executes a command in the workspace directory.
 * @param command The command to execute.
 * @param args The arguments to pass to the command.
 * @param input The input to pass to the command.
 * @returns A promise that resolves to the exit code and stdout of the command or rejects with stderr.
 * @note This function treats all exit codes as success unless it is non-zero and the stderr buffer has content.
 *        It is up to the caller to determine if the exit code is an error.
 */
export function executeCommand(
  command: string,
  args: string[],
  input: string,
  cwd?: string
): Promise<{ exitCode: number; stdout: string }> {
  console.log(`Executing command: ${command} ${args.join(" ")}`);

  return new Promise((resolve, reject) => {
    const childProcess = spawnCommand(command, args, cwd);

    let stdoutData = "";
    let stderrData = "";

    // Capture stdout
    childProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    // Capture stderr
    childProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    // Handle process errors
    childProcess.on("error", (error) => {
      reject(error);
    });

    // Process has closed
    childProcess.on("close", (exitCode) => {
      // Check for errors based on exit code and stderr content
      if (exitCode !== 0 && stderrData.length > 0) {
        reject(stderrData);
        // TODO: Log the more informative error message from stdout somewhere.
      } else {
        resolve({ exitCode, stdout: stdoutData });
      }
    });

    // Write input to stdin if provided
    if (input) {
      childProcess.stdin.write(input);
      childProcess.stdin.end();
    }
  });
}

/**
 * Spawns a child process with specified command and arguments.
 * @param command The command to execute.
 * @param args The arguments to pass to the command.
 * @param cwd The working directory to execute the command in.
 * @returns The spawned child process.
 */
function spawnCommand(command: string, args: string[], cwd?: string): ChildProcess {
  return spawn(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: cwd,
  });
}
