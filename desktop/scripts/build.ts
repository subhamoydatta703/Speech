import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir("dist", { recursive: true });
for (const [entry, output, target] of [
  ["src/main.ts", "main.cjs", "node"],
  ["src/preload.ts", "preload.cjs", "node"],
  ["src/ui/renderer.tsx", "renderer.js", "browser"],
] as const) {
  const result = await Bun.build({
    entrypoints: [entry],
    outdir: "dist",
    naming: output,
    target,
    format: target === "node" ? "cjs" : "esm",
    external: ["electron"],
    minify: false,
  });
  if (!result.success) throw new Error(result.logs.join("\n"));
}
await copyFile("src/ui/index.html", "dist/index.html");
await copyFile("src/ui/styles.css", "dist/styles.css");
await copyFile("resources/icon.ico", "dist/icon.ico");
await copyFile("resources/icon.png", "dist/icon.png");
// Release endpoints are public configuration; never copy backend or Clerk secrets.
const config = JSON.parse(await readFile("resources/release.json", "utf8"));
if (process.env.SPEECH_WEBSITE_URL)
  config.websiteUrl = process.env.SPEECH_WEBSITE_URL;
if (process.env.SPEECH_API_URL) config.apiUrl = process.env.SPEECH_API_URL;
config.channel = process.env.SPEECH_RELEASE_CHANNEL ?? config.channel;
for (const name of ["websiteUrl", "apiUrl"]) {
  const url = new URL(config[name]);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(`Invalid ${name}`);
  if (
    url.protocol !== "https:" &&
    !(
      config.channel === "local-development" &&
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.protocol === "http:"
    )
  )
    throw new Error(`${name} requires HTTPS`);
}
await writeFile(resolve("dist/release.json"), JSON.stringify(config, null, 2));
console.log("Built desktop application. Release channel: " + config.channel);
