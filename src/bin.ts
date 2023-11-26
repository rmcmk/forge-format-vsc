import { spawn, ChildProcess } from "child_process";

/**
 * Executes a command in the default working directory or the specified working directory if `cwd` is provided.
 *
 * @param command The command to execute.
 * @param args The arguments to pass to the command.
 * @param input The input to pass to the command.
 * @param cwd The current working directory in which to run the command.
 *
 * @returns {Promise<{ exitCode: number; stdout: string }>} A promise that resolves to the exit code and stdout of the command
 * or rejects with stderr. This function considers all exit codes as success unless it is non-zero and the stderr buffer has content.
 * It is up to the caller to determine if the exit code indicates an error.
 *
 * @note This function captures stdout and stderr during the command execution and handles process errors.
 * If provided, it writes input to the command's stdin.
 * The more informative error message from stdout is logged when there is an error with a non-zero exit code and stderr content.
 */
export function executeCommand(
  command: string,
  args: string[],
  input: string,
  cwd?: string
): Promise<{ exitCode: number; stdout: string }> {
  console.log(`Executing command: ${command} ${args.join(" ")}`);
  if (cwd) {
    console.log(`Working directory: ${cwd}`);
  }
  if (input) {
    // TODO: debug mode & verbosity settings for these kinds of logs
    console.log(`Input:\n${input}`);
  }

  return new Promise((resolve, reject) => {
    const childProcess = spawnCommand(command, args, cwd);

    if (!childProcess) {
      reject(new Error("Failed to spawn child process"));
      return;
    }

    let stdoutData = "";
    let stderrData = "";

    // Capture stdout
    if (childProcess.stdout) {
      childProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });
    }

    // Capture stderr
    if (childProcess.stderr) {
      childProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });
    }

    // Handle process errors
    childProcess.on("error", (error) => {
      reject(error);
    });

    // Process has closed
    childProcess.on(
      "close",
      (code: number | null, signal: NodeJS.Signals | null) => {
        if (code !== null) {
          // Check for errors based on exit code and stderr content
          if (code !== 0 && stderrData.length > 0) {
            reject(stderrData);
            // TODO: In this case, stdout has an informative error message. We should consider also logging this somewhere.
          } else {
            resolve({ exitCode: code, stdout: stdoutData });
          }
        } else if (signal !== null) {
          throw new Error(`Unexpected process termination. Signal: ${signal}`);
        } else {
          throw new Error(
            `Unexpected process termination. Null code and signal.`
          );
        }
      }
    );

    // Write input to stdin if provided
    if (input && childProcess.stdin) {
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
function spawnCommand(
  command: string,
  args: string[],
  cwd?: string
): ChildProcess | undefined {
  try {
    return spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: cwd,
    });
  } catch (error) {
    console.error("Error spawning command:", error);
    return undefined;
  }
}
