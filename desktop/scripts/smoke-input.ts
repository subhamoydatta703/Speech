import { resolve } from "node:path";
import { WindowsInput } from "../src/platform/windows-input";
const helper = new WindowsInput(resolve("resources/windows/input.ps1"));
try {
  const value = await helper.capture();
  if (!/^\d+$/.test(value.handle) || !Number.isInteger(value.processId))
    throw new Error("Windows helper returned invalid focus information");
  console.log("Windows focus helper passed. No keyboard input was sent.");
} finally {
  helper.dispose();
}
