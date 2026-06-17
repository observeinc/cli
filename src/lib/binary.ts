/**
 * Binary installation utilities.
 *
 * Handles determining where to install the observe binary,
 * downloading releases from GitHub, and moving binaries into place.
 */

import {
  copyFileSync,
  createReadStream,
  createWriteStream,
  readFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { delimiter, join } from "node:path";
import { ensureConfigDir, getConfigDir } from "./config";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import type { Readable } from "node:stream";
import { CONFIG_DIR_NAME, CONFIG_FILES } from "./constants";
import { fetchReleaseChecksums, releaseAssetUrl } from "./github-release";

const BINARY_NAME = "observe";

export function determineInstallDir({
  env,
  homeDir,
}: {
  env: Record<string, string | undefined>;
  homeDir: string;
}) {
  if (env.OBSERVE_INSTALL_DIR) {
    return env.OBSERVE_INSTALL_DIR;
  }

  const localBin = join(homeDir, ".local", "bin");
  if (existsSync(localBin) && isOnPath(localBin, env.PATH)) {
    return localBin;
  }

  return join(homeDir, CONFIG_DIR_NAME, CONFIG_FILES.bin.name);
}

function isOnPath(dir: string, pathEnv: string | undefined) {
  if (!pathEnv) return false;
  return pathEnv.split(delimiter).includes(dir);
}

export function installBinary({
  sourcePath,
  installDir,
}: {
  sourcePath: string;
  installDir: string;
}) {
  const configDir = getConfigDir();
  const isUnderConfigDir =
    installDir === configDir || installDir.startsWith(configDir + "/");

  if (isUnderConfigDir) {
    ensureConfigDir();
  }

  if (!existsSync(installDir)) {
    mkdirSync(installDir, {
      recursive: true,
      ...(isUnderConfigDir && { mode: CONFIG_FILES.bin.mode }),
    });
  }

  const dest = join(installDir, BINARY_NAME);

  if (existsSync(dest)) {
    unlinkSync(dest);
  }

  copyFileSync(sourcePath, dest);
  chmodSync(dest, 0o755);

  return dest;
}

export function detectPlatform() {
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  return { platform, arch };
}

function sha256HexOfFile(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

async function downloadToFile({
  url,
  destPath,
  signal,
}: {
  url: string;
  destPath: string;
  signal?: AbortSignal;
}) {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download binary from ${url}: HTTP ${String(response.status)}`,
    );
  }

  const fileStream = createWriteStream(destPath);
  await pipeline(response.body as unknown as Readable, fileStream);
}

async function gunzipFile({
  sourcePath,
  destPath,
}: {
  sourcePath: string;
  destPath: string;
}) {
  const gunzip = createGunzip();
  const input = createReadStream(sourcePath);
  const output = createWriteStream(destPath);
  await pipeline(input, gunzip, output);
}

async function downloadAndVerifyAsset({
  url,
  assetName,
  expectedHash,
  destPath,
  signal,
}: {
  url: string;
  assetName: string;
  expectedHash: string;
  destPath: string;
  signal?: AbortSignal;
}) {
  await downloadToFile({ url, destPath, signal });

  const actual = sha256HexOfFile(destPath);
  if (actual !== expectedHash) {
    throw new Error(
      `Binary integrity check failed for ${assetName}: checksum mismatch`,
    );
  }
}

export async function downloadReleaseBinary({
  tag,
  platform,
  arch,
  destPath,
  signal,
}: {
  tag: string;
  platform: string;
  arch: string;
  destPath: string;
  signal?: AbortSignal;
}) {
  const baseName = `observe-${platform}-${arch}`;
  const checksums = await fetchReleaseChecksums({ tag, signal });

  const gzName = `${baseName}.gz`;
  const gzHash = checksums.get(gzName);
  const rawHash = checksums.get(baseName);

  if (gzHash) {
    const gzPath = `${destPath}.gz`;
    try {
      await downloadAndVerifyAsset({
        url: releaseAssetUrl({ tag, assetName: gzName }),
        assetName: gzName,
        expectedHash: gzHash,
        destPath: gzPath,
        signal,
      });
      await gunzipFile({ sourcePath: gzPath, destPath });
      return;
    } catch (err) {
      if (!rawHash) throw err;
    } finally {
      rmSync(gzPath, { force: true });
    }
  }

  if (rawHash) {
    await downloadAndVerifyAsset({
      url: releaseAssetUrl({ tag, assetName: baseName }),
      assetName: baseName,
      expectedHash: rawHash,
      destPath,
      signal,
    });
    return;
  }

  throw new Error(
    `No release asset found for ${baseName} or ${baseName}.gz in ${tag}`,
  );
}
