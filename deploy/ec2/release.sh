#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

sha="${1:-}"
digest="${2:-}"
edition_date="${3:-}"
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ || ! "$digest" =~ ^[0-9a-f]{64}$ || ! "$edition_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo 'Expected commit SHA, archive SHA256 and approved edition date' >&2
  exit 1
fi

archive="/tmp/devpulse-${sha}.tar.gz"
root=/srv/devpulse-static
config=/etc/caddy/Caddyfile
domain=devpulse.tatsatpandey.com
if [[ -n "${DEVPULSE_SANDBOX:-}" ]]; then
  [[ "$DEVPULSE_SANDBOX" == /* && -d "$DEVPULSE_SANDBOX" && ! -L "$DEVPULSE_SANDBOX" ]] || exit 1
  sandbox="$(realpath "$DEVPULSE_SANDBOX")"
  [[ "$sandbox" != / ]] || exit 1
  archive="${sandbox}/archive.tar.gz"
  root="${sandbox}/site"
  config="${sandbox}/Caddyfile"
fi
release="${root}/releases/${sha}"

[[ -f "$archive" && ! -L "$archive" && -f "$config" && ! -L "$config" ]] || { echo 'Archive or regular Caddyfile missing' >&2; exit 1; }
[[ ! -L "$root" && ! -L "${root}/releases" && ! -L "${root}/.release.lock" ]] || { echo 'Unsafe release root' >&2; exit 1; }
install -d -m 755 "$root" "${root}/releases"
exec 9>"${root}/.release.lock"
flock -n 9 || { echo 'Another release is running' >&2; exit 1; }
[[ ! -e "$release" && ! -L "$release" ]] || { echo 'Release SHA already exists; refusing to overwrite it' >&2; exit 1; }
previous=''
if [[ -L "${root}/current" ]]; then
  previous="$(readlink "${root}/current")"
  [[ "$previous" =~ ^${root}/releases/[0-9a-f]{40}$ && -d "$previous" ]] || { echo 'Unfamiliar current release target' >&2; exit 1; }
elif [[ -e "${root}/current" ]]; then
  echo 'Current must be a symlink, not an existing directory or file' >&2
  exit 1
fi
systemctl is-active --quiet caddy || { echo 'Caddy is not active' >&2; exit 1; }

transaction="$(mktemp -d "${root}/.transaction-XXXXXXXX")"
candidate="${transaction}/Caddyfile"
backup="${transaction}/Caddyfile.before"
activated=false
finish() {
  status=$?
  trap - EXIT HUP INT TERM
  if [[ "$status" -ne 0 && "$activated" == true ]]; then
    set +e
    restored=true
    if [[ -n "$previous" ]]; then
      rm -f "${transaction}/restore"
      ln -s "$previous" "${transaction}/restore" && mv -Tf "${transaction}/restore" "${root}/current" || restored=false
    else
      rm -f "${root}/current" || restored=false
    fi
    cp -p "$backup" "${transaction}/Caddyfile.restore" && mv -f "${transaction}/Caddyfile.restore" "$config" || restored=false
    systemctl reload caddy || restored=false
    if [[ "$restored" == true ]]; then
      echo 'Restored the previous Caddy configuration and static release' >&2
    else
      echo "ROLLBACK FAILED: inspect host; backup retained at ${backup}" >&2
    fi
  fi
  if [[ "$activated" != true ]]; then rm -rf -- "$transaction"; fi
  exit "$status"
}
trap finish EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

printf '%s\n' "${domain} {" '    reverse_proxy localhost:3000' '}' > "${transaction}/legacy"
printf '%s\n' '# Managed by DevPulse static release' "${domain} {" "    root * ${root}/current" '    encode zstd gzip' '    @json path /json' '    header @json Content-Type "application/json; charset=utf-8"' '    file_server' '}' > "${transaction}/static-site"
original="$(cat "$config"; printf '.')"
original="${original%.}"
legacy="$(cat "${transaction}/legacy"; printf '.')"
legacy="${legacy%.}"
static_site="$(cat "${transaction}/static-site"; printf '.')"
static_site="${static_site%.}"
if [[ "$(grep -Fxc "${domain} {" "$config")" != 1 ]]; then
  echo 'Unfamiliar or duplicate DevPulse site block' >&2
  exit 1
fi
if [[ "$original" == *"$static_site"* ]]; then
  printf '%s' "$original" > "$candidate"
elif [[ "$original" == *"$legacy"* ]]; then
  printf '%s' "${original/"$legacy"/"$static_site"}" > "$candidate"
else
  echo 'Unfamiliar DevPulse site block: inspect it before switching the existing site' >&2
  exit 1
fi
cp -p "$config" "$backup"
cp "$archive" "${transaction}/archive.tar.gz"
printf '%s  %s\n' "$digest" "${transaction}/archive.tar.gz" | sha256sum --check --status
tar -tzf "${transaction}/archive.tar.gz" > "${transaction}/members"
tar -tvzf "${transaction}/archive.tar.gz" > "${transaction}/types"
if grep -qvE '^[-d]' "${transaction}/types"; then
  echo 'Archive contains links or special files' >&2
  exit 1
fi
while IFS= read -r member; do
  [[ "$member" =~ ^[A-Za-z0-9_./@-]+$ && "$member" != /* && "/${member}/" != *'/../'* ]] || { echo 'Unsafe archive path' >&2; exit 1; }
done < "${transaction}/members"
mkdir "${transaction}/build"
tar -xzf "${transaction}/archive.tar.gz" --no-same-owner --no-same-permissions -C "${transaction}/build"
for path in index.html latest.json rss.xml "edition/${edition_date}/index.html" release-sha.txt; do
  [[ -s "${transaction}/build/${path}" ]] || { echo "Static build is incomplete: ${path}" >&2; exit 1; }
done
printf '%s\n' "$sha" > "${transaction}/expected-sha"
cmp "${transaction}/expected-sha" "${transaction}/build/release-sha.txt"
find "${transaction}/build" -type d -exec chmod 755 {} +
find "${transaction}/build" -type f -exec chmod 644 {} +
caddy validate --config "$candidate" --adapter caddyfile
cmp "$config" "$backup" || { echo 'Caddyfile changed during validation' >&2; exit 1; }

mv "${transaction}/build" "$release"
ln -s "$release" "${transaction}/next"
activated=true
mv -Tf "${transaction}/next" "${root}/current"
install -m 644 "$candidate" "$config"
systemctl reload caddy
for path in / /latest.json /rss.xml "/edition/${edition_date}/" /release-sha.txt; do
  status="$(curl --fail --silent --show-error --proto '=https' --tlsv1.2 --connect-timeout 5 --max-time 20 --retry 2 --retry-max-time 60 --header 'Cache-Control: no-cache' --output "${transaction}/probe" --write-out '%{http_code}' "https://${domain}${path}")"
  [[ "$status" == 200 ]] || { echo "Probe returned HTTP ${status}: ${path}" >&2; exit 1; }
  artifact="${release}${path}"
  if [[ "$path" == */ ]]; then artifact="${artifact}index.html"; fi
  cmp "$artifact" "${transaction}/probe" || { echo "Live content differs from release: ${path}" >&2; exit 1; }
done
rm -f "${transaction}/archive.tar.gz" "${transaction}/probe"
printf 'Released %s to https://%s\n' "$sha" "$domain"
