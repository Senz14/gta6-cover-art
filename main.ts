/**
 * Entrypoint for the cover-art submission.
 *
 * What this program does, in order:
 *   1. figure out where it lives and where the result should land,
 *   2. sanity-check every input it depends on,
 *   3. mirror the static site and its preview images into the target,
 *   4. ask the vendored library to summarise the mirrored tree,
 *   5. print a short receipt so a human can see what happened.
 *
 * Nothing here talks to the network and nothing needs installing:
 * it is plain Node with a handful of small helpers written for
 * this file.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import * as crypto from "node:crypto";
import { buildDossier } from "./vendor/makefun-app.ts";

type CopiedEntry = {
  label: string;
  bytes: number;
  digest: string;
};

function bail(message: string): never {
  throw new Error(`[cover-art build] ${message}`);
}

function requirePath(target: string, description: string, wantDirectory: boolean): void {
  let info: fs.Stats;
  try {
    info = fs.statSync(target);
  } catch {
    bail(`missing ${description}: expected at ${target}`);
  }
  if (wantDirectory && !info.isDirectory()) {
    bail(`${description} is not a folder: ${target}`);
  }
  if (!wantDirectory && !info.isFile()) {
    bail(`${description} is not a regular file: ${target}`);
  }
}

function digestOfFile(absolutePath: string): string {
  const hasher = crypto.createHash("sha256");
  hasher.update(fs.readFileSync(absolutePath));
  return hasher.digest("hex");
}

// Depth-first walk that yields every regular file below `root`.
// Entries are visited in sorted order so logs stay deterministic.
function enumerateFiles(root: string, prefix: string, sink: string[]): void {
  const names = fs.readdirSync(root);
  names.sort();
  for (const name of names) {
    const absolute = path.join(root, name);
    const rel = prefix === "" ? name : `${prefix}/${name}`;
    const info = fs.lstatSync(absolute);
    if (info.isSymbolicLink()) {
      bail(`refusing to follow a symbolic link while scanning: ${absolute}`);
    }
    if (info.isDirectory()) {
      enumerateFiles(absolute, rel, sink);
    } else if (info.isFile()) {
      sink.push(rel);
    } else {
      bail(`encountered a non-file entry while scanning: ${absolute}`);
    }
  }
}

// Mirror one source folder into its destination, file by file.
// Returns a receipt entry for each file that was copied.
function mirrorFolder(sourceDir: string, destDir: string, label: string): CopiedEntry[] {
  fs.mkdirSync(destDir, { recursive: true });
  const relativeFiles: string[] = [];
  enumerateFiles(sourceDir, "", relativeFiles);
  const receipt: CopiedEntry[] = [];
  for (const rel of relativeFiles) {
    const from = path.join(sourceDir, ...rel.split("/"));
    const to = path.join(destDir, ...rel.split("/"));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    const size = fs.statSync(to).size;
    receipt.push({ label: `${label}/${rel}`, bytes: size, digest: digestOfFile(to) });
  }
  return receipt;
}

function pickDestination(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (typeof fromEnv === "string" && fromEnv.trim() !== "") {
    return path.resolve(fromEnv.trim());
  }
  return "/output";
}

function run(): void {
  const ownFile = url.fileURLToPath(import.meta.url);
  const baseDir = path.dirname(ownFile);
  const destination = pickDestination();

  const appSource = path.join(baseDir, "app");
  const shotsSource = path.join(baseDir, "screenshots");
  const vendorFile = path.join(baseDir, "vendor", "makefun-app.ts");
  const landingPage = path.join(appSource, "index.html");

  // Fail early with a named culprit instead of a cryptic copy error.
  requirePath(appSource, "app folder", true);
  requirePath(shotsSource, "screenshots folder", true);
  requirePath(vendorFile, "vendored dossier library", false);
  requirePath(landingPage, "app entry page (index.html)", false);

  const shotNames = fs.readdirSync(shotsSource).filter((n) => !n.startsWith("."));
  if (shotNames.length === 0) {
    bail(`screenshots folder holds no images: ${shotsSource}`);
  }

  fs.mkdirSync(destination, { recursive: true });

  const appReceipt = mirrorFolder(appSource, path.join(destination, "app"), "app");
  const shotReceipt = mirrorFolder(shotsSource, path.join(destination, "screenshots"), "screenshots");
  const everything = [...appReceipt, ...shotReceipt];

  // Limits handed to the dossier builder. The byte budgets are
  // spelled as products so the intent (KiB / MiB) stays obvious.
  const capsForDossier = {
    text_max_bytes: 160 * 1024, screenshots: { max: 4, max_bytes: 256 * 1024 },
    app_max_files: 993, app_max_bytes: 48 * 1024 * 1024, app_path_max_bytes: 1000,
  };

  const dossierBytes = buildDossier(destination, capsForDossier);
  const dossierTarget = path.join(destination, "dossier.json");
  fs.writeFileSync(dossierTarget, dossierBytes);

  const totalBytes = everything.reduce((acc, entry) => acc + entry.bytes, 0);
  console.log(`destination: ${destination}`);
  console.log(`copied app: ${appReceipt.length} file(s)`);
  console.log(`copied screenshots: ${shotReceipt.length} file(s)`);
  console.log(`copied total: ${everything.length} file(s), ${totalBytes} byte(s)`);
  for (const entry of everything) {
    console.log(`  ${entry.label} — ${entry.bytes} B — sha256:${entry.digest.slice(0, 16)}…`);
  }
  const dossierDigest = crypto.createHash("sha256").update(dossierBytes).digest("hex");
  console.log(`dossier.json: ${dossierBytes.length} B — sha256:${dossierDigest.slice(0, 16)}…`);
  console.log("build finished ok");
}

try {
  run();
} catch (problem) {
  const text = problem instanceof Error ? problem.message : String(problem);
  console.error(text);
  process.exitCode = 1;
}
