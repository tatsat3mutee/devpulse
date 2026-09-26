#!/usr/bin/env bash
# Runs on the EC2 host from a systemd timer: pulls the prebuilt site branch and releases it if new.
set -Eeuo pipefail
umask 022

repo="${DEVPULSE_REPO:-https://github.com/tatsat3mutee/devpulse}"
root="${DEVPULSE_ROOT:-/srv/devpulse-static}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

commit="$(git ls-remote "$repo" refs/heads/site | cut -f1)"
[[ "$commit" =~ ^[0-9a-f]{40}$ ]] || { echo 'No site branch found' >&2; exit 1; }
[[ "$(cat "${root}/.last-site-commit" 2>/dev/null || true)" == "$commit" ]] && exit 0

work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
curl --fail --silent --show-error --proto '=https' --tlsv1.2 --max-time 120 -L -o "${work}/site.tar.gz" "${repo/github.com/codeload.github.com}/tar.gz/${commit}"
mkdir "${work}/x"
tar -xzf "${work}/site.tar.gz" --no-same-owner -C "${work}/x"
build="$(find "${work}/x" -mindepth 1 -maxdepth 1 -type d | head -1)"
sha="$(tr -d '[:space:]' < "${build}/release-sha.txt")"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo 'Site build has no valid release SHA' >&2; exit 1; }
if [[ -d "${root}/releases/${sha}" ]]; then
  printf '%s\n' "$commit" > "${root}/.last-site-commit"
  exit 0
fi
edition_date="$(grep -oE '"date":"[0-9]{4}-[0-9]{2}-[0-9]{2}"' "${build}/latest.json" | head -1 | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')"
tar -czf "/tmp/devpulse-${sha}.tar.gz" -C "$build" .
digest="$(sha256sum "/tmp/devpulse-${sha}.tar.gz" | cut -d ' ' -f 1)"
bash "${here}/release.sh" "$sha" "$digest" "$edition_date"
rm -f "/tmp/devpulse-${sha}.tar.gz"
printf '%s\n' "$commit" > "${root}/.last-site-commit"

current="$(readlink "${root}/current")"
find "${root}/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +11 | cut -d ' ' -f 2- | while read -r old; do
  [[ "$old" != "$current" ]] && rm -rf -- "$old"
done
