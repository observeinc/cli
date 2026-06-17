#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
DIM='\033[0;2m'
BOLD='\033[1m'
NC='\033[0m'

# Only use colors when connected to a terminal
if [[ ! -t 1 ]]; then
  RED='' GREEN='' DIM='' BOLD='' NC=''
fi

error() {
  echo -e "${RED}error${NC}: $*" >&2
  exit 1
}

info() {
  echo -e "${DIM}$*${NC}"
}

success() {
  echo -e "${GREEN}$*${NC}"
}

usage() {
  cat <<EOF
Install the Observe CLI

Usage:
  curl -fsSL https://raw.githubusercontent.com/observeinc/cli/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/observeinc/cli/main/install.sh | bash -s -- [options]

Options:
  -h, --help             Show this help message
  -v, --version <ver>    Install a specific version (e.g., 0.1.0)
  --no-modify-path       Don't modify shell config files (.zshrc, .bashrc, etc.)

Environment Variables:
  OBSERVE_INSTALL_DIR    Override the installation directory
  OBSERVE_VERSION        Install a specific version

Examples:
  curl -fsSL https://raw.githubusercontent.com/observeinc/cli/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/observeinc/cli/main/install.sh | bash -s -- --version 0.1.0
  OBSERVE_VERSION=0.1.0 curl -fsSL https://raw.githubusercontent.com/observeinc/cli/main/install.sh | bash
EOF
}

requested_version="${OBSERVE_VERSION:-}"
no_modify_path=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    -v|--version)
      if [[ -n "${2:-}" ]]; then
        requested_version="$2"
        shift 2
      else
        error "--version requires a version argument"
      fi
      ;;
    --no-modify-path)
      no_modify_path=true
      shift
      ;;
    *) shift ;;
  esac
done

# Detect OS
case "$(uname -s)" in
  Darwin*)  os="darwin" ;;
  Linux*)   os="linux" ;;
  *) error "Unsupported OS: $(uname -s). Only macOS and Linux are supported." ;;
esac

# Detect architecture
arch=$(uname -m)
case "$arch" in
  x86_64)         arch="x64" ;;
  aarch64|arm64)  arch="arm64" ;;
  *) error "Unsupported architecture: $arch" ;;
esac

# On macOS x64, check for Rosetta and prefer arm64 if running under translation
if [[ "$os" == "darwin" && "$arch" == "x64" ]]; then
  if [[ $(sysctl -n sysctl.proc_translated 2>/dev/null) == "1" ]]; then
    arch="arm64"
    info "Running under Rosetta 2. Downloading arm64 build instead."
  fi
fi

GITHUB_REPO="https://github.com/observeinc/cli"

# Resolve version via releases/latest redirect (avoids GitHub API rate limits)
version="$requested_version"
if [[ -z "$version" ]]; then
  version=$(curl -fsSLI -o /dev/null -w '%{url_effective}' \
    "${GITHUB_REPO}/releases/latest" \
    | sed -n 's|.*/releases/tag/v||p')
  if [[ -z "$version" ]]; then
    error "Failed to fetch latest version from GitHub. Try pinning the version: OBSERVE_VERSION=<version> curl -fsSL .../install.sh | bash"
  fi
fi

# Strip leading 'v' if present
version="${version#v}"

filename="observe-${os}-${arch}"

info "Downloading observe v${version}..."

tmpdir="${TMPDIR:-${TMP:-${TEMP:-/tmp}}}"
tmp_binary="${tmpdir}/observe-install-$$"
tmp_gz="${tmpdir}/observe-install-$$.gz"
tmp_checksums="${tmpdir}/observe-checksums-$$.txt"
trap 'rm -f "$tmp_binary" "$tmp_gz" "$tmp_checksums"' EXIT

release_url="${GITHUB_REPO}/releases/download/v${version}"

checksums_file="observe_${version}_checksums.txt"
curl -fsSL "${release_url}/${checksums_file}" -o "$tmp_checksums" || \
  error "Failed to download ${checksums_file} for v${version}"

# Verifies a downloaded file's SHA-256 against the checksums file.
verify_checksum() {
  local file="$1" asset_name="$2"
  local expected actual

  expected=$(awk -v name="${asset_name}" '$2 == name { print $1 }' "$tmp_checksums")
  [[ -n "$expected" ]] || error "No checksum found for ${asset_name} in ${checksums_file}"

  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$file" | awk '{print $1}')
  else
    actual=$(shasum -a 256 "$file" | awk '{print $1}')
  fi

  if [[ "$actual" != "$expected" ]]; then
    error "Binary integrity check failed for ${asset_name}: checksum mismatch"
  fi
}

# Prefer compressed (.gz) download; fall back to raw binary.
if curl -fsSL "${release_url}/${filename}.gz" -o "$tmp_gz" 2>/dev/null; then
  verify_checksum "$tmp_gz" "${filename}.gz"
  gunzip -c "$tmp_gz" > "$tmp_binary"
elif curl -fsSL "${release_url}/${filename}" -o "$tmp_binary" 2>/dev/null; then
  verify_checksum "$tmp_binary" "$filename"
else
  error "No release asset found for ${filename} or ${filename}.gz in v${version}"
fi

chmod +x "$tmp_binary"

# Delegate installation to the binary itself
setup_args="--move-binary --method curl"
if [[ "$no_modify_path" == "true" ]]; then
  setup_args="$setup_args --no-modify-path"
fi

trap - EXIT

# shellcheck disable=SC2086
"$tmp_binary" cli install $setup_args
