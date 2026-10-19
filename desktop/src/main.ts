import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  Menu,
  Tray,
  nativeImage,
  clipboard,
  shell,
  session,
  screen,
} from "electron";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { activateInstallation } from "./auth/activation";
import {
  clearActivation,
  dataDirectory,
  loadActivation,
  loadShortcut,
  saveActivation,
  saveShortcut,
  validShortcut,
} from "./config/storage";
import { downloadModel, modelPath, verifyModel } from "./models/manager";
import { transcribe, cleanStaleAudio } from "./stt/engine";
import { WindowsInput } from "./platform/windows-input";
import { windowsRuntimePresent } from "./platform/runtime";
import type { AppStatus } from "./shared/types";

let main: BrowserWindow,
  overlay: BrowserWindow,
  tray: Tray,
  input: WindowsInput;
let quitting = false,
  stopping = false,
  target: string | undefined,
  transcript = "";
let activationJob: AbortController | undefined,
  modelJob: AbortController | undefined,
  inferenceJob: AbortController | undefined;
let generation = 0;
let preparingRecording = false;
let config: { websiteUrl: string; apiUrl: string; channel: string };
const state: AppStatus = {
  activated: false,
  modelReady: false,
  runtimeReady: false,
  busy: false,
  phase: "idle",
  message: "Welcome to Speech. Let’s finish your setup.",
  shortcut: "Control+Shift+Space",
  version: app.getVersion(),
  development: true,
};
// Resolve at runtime: Bun can inline source __dirname while bundling.
const bundle = join(app.getAppPath(), "dist");
const resource = (path: string) =>
  join(
    app.isPackaged ? process.resourcesPath : resolve(bundle, "../resources"),
    path,
  );
const rendererUrl = pathToFileURL(join(bundle, "index.html")).href;
const smokeTest =
  !app.isPackaged &&
  process.env.NODE_ENV === "test" &&
  Boolean(process.env.SPEECH_TEST_USER_DATA);
if (smokeTest) app.setPath("userData", process.env.SPEECH_TEST_USER_DATA!);

function publish() {
  for (const window of [main, overlay])
    if (window && !window.isDestroyed())
      window.webContents.send("speech:state", { ...state });
}
function update(value: Partial<AppStatus>) {
  Object.assign(state, value);
  publish();
}
function failure(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
function displayOverlay() {
  const bounds = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint(),
  ).workArea;
  overlay.setPosition(
    Math.round(bounds.x + (bounds.width - 360) / 2),
    bounds.y + bounds.height - 100,
  );
  overlay.showInactive();
}
function showMain() {
  main.show();
  main.focus();
  publish();
}
let releasePoller: ReturnType<typeof setInterval> | undefined;

/** Parse an Electron accelerator into virtual key codes for GetAsyncKeyState polling. */
function shortcutKeyCodes(shortcut: string): number[] {
  const map: Record<string, number> = {
    control: 0x11, ctrl: 0x11,
    shift: 0x10,
    alt: 0x12,
    meta: 0x5b, super: 0x5b, command: 0x5b,
    space: 0x20, tab: 0x09, escape: 0x1b, enter: 0x0d,
    backspace: 0x08, delete: 0x2e,
    up: 0x26, down: 0x28, left: 0x25, right: 0x27,
    f1: 0x70, f2: 0x71, f3: 0x72, f4: 0x73, f5: 0x74, f6: 0x75,
    f7: 0x76, f8: 0x77, f9: 0x78, f10: 0x79, f11: 0x7a, f12: 0x7b,
  };
  return shortcut
    .split("+")
    .map((k) => {
      const lower = k.trim().toLowerCase();
      if (map[lower] !== undefined) return map[lower];
      // Single character → its ASCII code (uppercase)
      if (lower.length === 1) return lower.toUpperCase().charCodeAt(0);
      return 0;
    })
    .filter((c) => c > 0);
}

/** Start polling key state — when ALL keys in the shortcut are released, stop recording. */
function startReleasePolling() {
  stopReleasePolling();
  const codes = shortcutKeyCodes(state.shortcut);
  if (codes.length === 0) return;

  // Build a tiny PowerShell snippet that outputs "1" while all keys are held, "0" when released.
  // We run a one-shot PowerShell to poll every 50 ms in the native process for lower latency.
  const { spawn: spawnProc } = require("node:child_process") as typeof import("node:child_process");
  const ps = spawnProc(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `
Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);' -Name U -Namespace W
while ($true) {
  Start-Sleep -Milliseconds 50
  $held = $true
  foreach ($k in @(${codes.join(",")})) {
    if (([W.U]::GetAsyncKeyState($k) -band 0x8000) -eq 0) { $held = $false; break }
  }
  if (-not $held) { Write-Output "RELEASED"; exit 0 }
}
`,
    ],
    { windowsHide: true, stdio: "pipe" },
  );
  const rl = require("node:readline") as typeof import("node:readline");
  rl.createInterface({ input: ps.stdout }).on("line", (line: string) => {
    if (line.trim() === "RELEASED" && state.phase === "recording") {
      stopReleasePolling();
      // Trigger stop recording (same as pressing shortcut again)
      stopping = true;
      main.webContents.send("speech:capture", "stop");
    }
  });
  ps.stderr.on("data", () => {});
  ps.on("exit", () => { releasePoller = undefined; });
  // Store a handle so we can kill it if needed
  releasePoller = setInterval(() => {}, 86400000) as any; // keep-alive — actual cleanup via ps.kill()
  (releasePoller as any).__ps = ps;
}

function stopReleasePolling() {
  if (releasePoller) {
    const ps = (releasePoller as any).__ps;
    if (ps && !ps.killed) ps.kill();
    clearInterval(releasePoller);
    releasePoller = undefined;
  }
}

function cancelRecording() {
  generation++;
  inferenceJob?.abort();
  inferenceJob = undefined;
  stopping = false;
  target = undefined;
  stopReleasePolling();
  main.webContents.send("speech:capture", "cancel");
  update({ phase: "idle", message: "Recording cancelled." });
  overlay.hide();
}
async function toggleRecording() {
  if (!state.activated || !state.modelReady || !state.runtimeReady) {
    showMain();
    update({
      message:
        "Complete account, model and Windows runtime setup before recording.",
    });
    return;
  }
  if (
    state.phase === "processing" ||
    state.busy ||
    stopping ||
    preparingRecording
  )
    return;
  if (state.phase === "recording") {
    stopping = true;
    stopReleasePolling();
    main.webContents.send("speech:capture", "stop");
    return;
  }
  preparingRecording = true;
  target = undefined;
  transcript = "";
  const current = ++generation;
  main.webContents.send("speech:transcript", "");
  try {
    const foreground = await input.capture();
    if (foreground.processId !== process.pid && foreground.handle !== "0")
      target = foreground.handle;
  } catch {
    /* Recording still works; retain the transcript for manual copy. */
  } finally {
    preparingRecording = false;
  }
  if (current !== generation) return;
  update({
    phase: "recording",
    message:
      "Listening… Hold your shortcut — release to finish. Limit: 60 seconds.",
  });
  displayOverlay();
  main.webContents.send("speech:capture", "start");
  // Start monitoring for key release
  startReleasePolling();
}
async function runTranscription(samples: unknown, rate: unknown) {
  if (
    !state.activated ||
    !state.modelReady ||
    state.phase !== "recording" ||
    inferenceJob
  )
    throw new Error("No recording is active.");
  if (!(samples instanceof Float32Array) || typeof rate !== "number")
    throw new Error("Invalid microphone audio.");
  const current = generation;
  const controller = new AbortController();
  inferenceJob = controller;
  update({ phase: "processing", message: "Transcribing on your computer…" });
  try {
    const text = await transcribe(
      resource("engine/whisper-cli.exe"),
      modelPath(dataDirectory()),
      samples,
      rate,
      controller.signal,
    );
    if (controller.signal.aborted || current !== generation) return;
    transcript = text;
    main.webContents.send("speech:transcript", text);
    let inserted = false;
    if (text && target) {
      // Recheck focus before changing the clipboard and again immediately before paste.
      const foreground = await input.capture().catch(() => undefined);
      if (foreground?.handle === target) {
        clipboard.writeText(text);
        inserted = await input.paste(target).catch(() => false);
      }
    }
    update({
      phase: "idle",
      message: !text
        ? "No speech recognized. Try again."
        : inserted
          ? "Text sent to the focused app. If it did not appear, use Copy text."
          : "Your text is ready. Open Speech from the tray and use Copy text.",
    });
    if (!inserted && text) showMain();
  } catch (error) {
    if (!controller.signal.aborted && current === generation)
      update({ phase: "idle", message: failure(error) });
  } finally {
    if (inferenceJob === controller) inferenceJob = undefined;
    if (current === generation) {
      stopping = false;
      target = undefined;
    }
    if (current === generation)
      setTimeout(() => {
        if (state.phase === "idle") overlay.hide();
      }, 1800);
  }
}
async function connectAccount() {
  if (activationJob || state.phase !== "idle") return;
  const controller = new AbortController();
  activationJob = controller;
  update({
    busy: true,
    message: "Opening installation confirmation in your browser…",
  });
  try {
    const activation = await activateInstallation(
      config.apiUrl,
      config.websiteUrl,
      controller.signal,
      (confirmationCode) =>
        update({
          confirmationCode,
          message:
            "Match this code in your browser, then continue installation. Your existing website session is reused.",
        }),
      (url) => shell.openExternal(url),
    );
    controller.signal.throwIfAborted();
    await saveActivation(activation);
    update({
      activated: true,
      email: activation.user.email,
      confirmationCode: undefined,
      message: "Account connected. Download the local model to finish setup.",
    });
  } catch (error) {
    update({
      message: controller.signal.aborted
        ? "Confirmation cancelled. You can start again."
        : failure(error),
      confirmationCode: undefined,
    });
  } finally {
    activationJob = undefined;
    update({ busy: Boolean(modelJob) });
  }
}
async function installModel() {
  if (modelJob || !state.activated || state.phase !== "idle") return;
  const controller = new AbortController();
  modelJob = controller;
  update({
    busy: true,
    modelProgress: 0,
    message: "Downloading the public speech model directly to this PC…",
  });
  try {
    await downloadModel(dataDirectory(), controller.signal, (modelProgress) => {
      if (state.modelProgress !== modelProgress) update({ modelProgress });
    });
    update({
      modelReady: true,
      message: "Speech is ready. You can now dictate offline.",
    });
  } catch (error) {
    update({
      message: controller.signal.aborted
        ? "Download cancelled. Click Download model to restart."
        : failure(error),
    });
  } finally {
    modelJob = undefined;
    update({ busy: Boolean(activationJob), modelProgress: undefined });
  }
}
function registerShortcut(value: string) {
  if (!validShortcut(value))
    throw new Error("Use a shortcut such as Control+Shift+Space or Control+M.");
  if (value === state.shortcut && globalShortcut.isRegistered(value)) return;
  if (
    !globalShortcut.register(value, () => {
      void toggleRecording();
    })
  )
    throw new Error("This shortcut is already in use. Choose another.");
  if (state.shortcut !== value) globalShortcut.unregister(state.shortcut);
  state.shortcut = value;
  publish();
}
function handle(name: string, action: (...args: any[]) => unknown) {
  ipcMain.handle("speech:" + name, async (event, ...args) => {
    const allowedWindow =
      event.sender === main.webContents ||
      (name === "status" && event.sender === overlay.webContents);
    if (
      !allowedWindow ||
      event.senderFrame !== event.sender.mainFrame ||
      !event.senderFrame.url.startsWith(rendererUrl)
    )
      throw new Error("Untrusted application request.");
    try {
      return await action(...args);
    } catch (error) {
      update({ message: failure(error) });
      throw new Error(failure(error));
    }
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (main) showMain();
  });
  app
    .whenReady()
    .then(async () => {
      if (process.platform !== "win32" || process.arch !== "x64")
        throw new Error("This build supports Windows x64 only.");
      config = JSON.parse(await readFile(join(bundle, "release.json"), "utf8"));
      state.development = config.channel === "local-development";
      // Deny permissions except microphone capture by our packaged main renderer.
      session.defaultSession.setPermissionRequestHandler(
        (contents, permission, callback) =>
          callback(contents === main?.webContents && permission === "media"),
      );
      session.defaultSession.setPermissionCheckHandler(
        (contents, permission) =>
          contents === main?.webContents && permission === "media",
      );
      const settings = {
        preload: join(bundle, "preload.cjs"),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        backgroundThrottling: false,
      };
      main = new BrowserWindow({
        width: 780,
        height: 820,
        minWidth: 560,
        minHeight: 620,
        show: false,
        backgroundColor: "#fbfaf7",
        title: "Speech — An AgEX product",
        icon: resource("icon.ico"),
        autoHideMenuBar: true,
        webPreferences: settings,
      });
      overlay = new BrowserWindow({
        width: 360,
        height: 70,
        frame: false,
        transparent: true,
        backgroundColor: "#00000000",
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: false,
        resizable: false,
        show: false,
        webPreferences: settings,
      });
      overlay.setIgnoreMouseEvents(true);
      for (const window of [main, overlay]) {
        window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
        window.webContents.on("will-navigate", (event) =>
          event.preventDefault(),
        );
      }
      main.on("close", (event) => {
        if (!quitting) {
          event.preventDefault();
          main.hide();
        }
      });
      await cleanStaleAudio();
      input = new WindowsInput(resource("windows/input.ps1"));
      const activation = await loadActivation();
      state.activated = Boolean(activation);
      state.email = activation?.user.email;
      state.shortcut = await loadShortcut();
      update({ message: "Checking the local model…" });
      handle("status", () => ({ ...state }));
      handle("activate", connectAccount);
      handle("cancel-activation", () => activationJob?.abort());
      handle("download-model", installModel);
      handle("install-runtime", async () => {
        if (state.busy || state.phase !== 'idle') return;
        if (await windowsRuntimePresent()) {
          update({ runtimeReady: true, message: 'Windows runtime is ready.' });
          return;
        }
        const error = await shell.openPath(resource('windows/vc_redist.x64.exe'));
        if (error) throw new Error('Could not open Microsoft’s runtime installer. Install the Visual C++ x64 Redistributable from Microsoft, then reopen Speech.');
        update({ message: 'Finish Microsoft’s installer, then click Check runtime again. Windows may ask for administrator permission.' });
      });
      handle("cancel-model", () => modelJob?.abort());
      handle("toggle", toggleRecording);
      handle("cancel", cancelRecording);
      handle("transcribe", runTranscription);
      handle("copy", () => {
        if (transcript) {
          clipboard.writeText(transcript);
          update({ message: "Text copied. Paste it into your document." });
        }
      });
      handle("hide", () => main.hide());
      handle("sign-out", async () => {
        activationJob?.abort();
        modelJob?.abort();
        cancelRecording();
        await clearActivation();
        transcript = "";
        main.webContents.send("speech:transcript", "");
        update({
          activated: false,
          email: undefined,
          message:
            "This PC is disconnected. Reconnect your account to use Speech.",
        });
      });
      handle("shortcut", async (value) => {
        registerShortcut(value);
        await saveShortcut(value);
        update({ message: "Shortcut updated." });
      });
      const image = nativeImage.createFromPath(resource("icon.ico"));
      tray = new Tray(image);
      tray.setToolTip("Speech — An AgEX product");
      tray.setContextMenu(
        Menu.buildFromTemplate([
          { label: "Open Speech", click: showMain },
          {
            label: "Start / stop dictation",
            click: () => {
              void toggleRecording();
            },
          },
          { label: "Cancel recording", click: cancelRecording },
          { type: "separator" },
          { label: "Quit Speech", click: () => app.quit() },
        ]),
      );
      tray.on("double-click", showMain);
      try {
        registerShortcut(state.shortcut);
      } catch (error) {
        update({ message: failure(error) });
      }
      await main.loadFile(join(bundle, "index.html"));
      await overlay.loadFile(join(bundle, "index.html"), {
        query: { overlay: "1" },
      });
      if (!smokeTest) showMain();
      state.modelReady = await verifyModel(modelPath(dataDirectory()));
      state.runtimeReady = await windowsRuntimePresent();
      update({
        message:
          state.activated && state.modelReady
            ? "Ready for offline dictation."
            : state.activated
              ? "Account connected. Download the model to finish setup."
              : "Confirm your installation to connect the account you used on the website.",
      });
    })
    .catch((error) => {
      console.error("Speech could not start:", failure(error));
      app.quit();
    });
  app.on("before-quit", () => {
    quitting = true;
    activationJob?.abort();
    modelJob?.abort();
    inferenceJob?.abort();
    stopReleasePolling();
    globalShortcut.unregisterAll();
    input?.dispose();
  });
  app.on("window-all-closed", () => {
    /* The tray keeps the application running. */
  });
}
