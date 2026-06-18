/**
 * Thin wrapper around GitHub Releases for observeinc/cli.
 *
 * Avoids the authenticated GitHub REST API to sidestep the 60 req/hr/IP
 * unauthenticated rate limit. Version discovery uses the releases/latest
 * redirect; asset downloads and checksums use predictable release URLs.
 */

import { GITHUB_RELEASES_URL } from "./constants";

/**
 * Resolves the latest release tag by following the releases/latest redirect.
 * Does not consume GitHub API rate-limit budget.
 */
export async function fetchLatestRelease({
  signal,
}: { signal?: AbortSignal } = {}) {
  const response = await fetch(`${GITHUB_RELEASES_URL}/latest`, {
    redirect: "manual",
    signal,
  });

  const location = response.headers.get("location");
  if (!location) {
    throw new Error(
      "Failed to resolve latest release: no redirect from GitHub",
    );
  }

  const tag = location.split("/releases/tag/").pop();
  if (!tag) {
    throw new Error(`Failed to parse release tag from redirect: ${location}`);
  }

  return {
    version: tag.replace(/^v/, ""),
    tag,
    url: `${GITHUB_RELEASES_URL}/tag/${tag}`,
  };
}

/**
 * Downloads and parses the checksums file for a given release tag.
 * Returns a Map of asset filename -> sha256 hex digest.
 */
export async function fetchReleaseChecksums({
  tag,
  signal,
}: {
  tag: string;
  signal?: AbortSignal;
}) {
  const version = tag.replace(/^v/, "");
  const url = `${GITHUB_RELEASES_URL}/download/${tag}/observe_${version}_checksums.txt`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(
      `Failed to download checksums for ${tag}: HTTP ${String(response.status)}`,
    );
  }

  const text = await response.text();
  const checksums = new Map<string, string>();

  for (const line of text.trim().split("\n")) {
    const match = /^([a-f0-9]{64})\s+(.+)$/.exec(line.trim());
    if (match?.[1] && match[2]) {
      checksums.set(match[2], match[1]);
    }
  }

  return checksums;
}

/** Constructs a direct download URL for a release asset. */
export function releaseAssetUrl({
  tag,
  assetName,
}: {
  tag: string;
  assetName: string;
}) {
  return `${GITHUB_RELEASES_URL}/download/${tag}/${assetName}`;
}
