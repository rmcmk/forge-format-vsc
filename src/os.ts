import os from "os";

export function homedir(): string {
  return os.homedir();
}

export function isWindows(): boolean {
  return os.platform() === "win32";
}
