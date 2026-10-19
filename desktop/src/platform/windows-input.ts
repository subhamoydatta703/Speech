import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";

export class WindowsInput {
  private child: ChildProcessWithoutNullStreams;
  private sequence = 0;
  private pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  constructor(script: string) {
    this.child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
      ],
      { windowsHide: true, stdio: "pipe" },
    );
    createInterface({ input: this.child.stdout }).on("line", (line) => {
      try {
        const message = JSON.parse(line),
          entry = this.pending.get(message.id);
        if (!entry) return;
        clearTimeout(entry.timer);
        this.pending.delete(message.id);
        message.error
          ? entry.reject(new Error(message.error))
          : entry.resolve(message.result);
      } catch {
        /* Ignore compiler output; only matching JSON responses are accepted. */
      }
    });
    this.child.stderr.on("data", () => {});
    const unavailable = () => {
      for (const entry of this.pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error("Windows input is unavailable. Use Copy text."));
      }
      this.pending.clear();
    };
    this.child.on("error", unavailable);
    this.child.on("exit", unavailable);
    this.child.stdin.on("error", unavailable);
  }
  private call(action: string, handle?: string): Promise<any> {
    if (!this.child.stdin.writable)
      return Promise.reject(new Error("Windows input is unavailable."));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Windows input did not respond."));
      }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(JSON.stringify({ id, action, handle }) + "\n");
    });
  }
  capture(): Promise<{ handle: string; processId: number }> {
    return this.call("capture");
  }
  async paste(handle: string): Promise<boolean> {
    return Boolean((await this.call("paste", handle)).inserted);
  }
  dispose() {
    this.child.kill();
  }
}
