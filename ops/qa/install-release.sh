#!/usr/bin/env bash
set -euo pipefail

commit=${1:-}
checksum=${2:-}
[[ $commit =~ ^[0-9a-f]{40}$ && $checksum =~ ^[0-9a-f]{64}$ ]] || exit 2

releases=/var/www/sam-qa-releases
live=/var/www/sam-qa-live
release="$releases/$commit-$checksum"
bucket=sam-hotspot-qa-017820702885-ap-south-1
site=https://qa.coecmamsupport.com
api=https://qa-api.coecmamsupport.com

exec 9>"$releases/.deploy.lock"
flock -w 50 9
previous=$(readlink -f "$live")
archive=$(mktemp)
staging=$(mktemp -d "$releases/.staging.XXXXXXXX")
next_link="$staging/live"
trap 'rm -- "$archive"; if [[ -d $staging ]]; then rm -r -- "$staging"; fi' EXIT

if [[ ! -d $release ]]; then
    aws s3api get-object --region ap-south-1 --bucket "$bucket" \
        --key "deployments/frontend/$commit/$checksum.tar.gz" "$archive" >/dev/null
    printf '%s  %s\n' "$checksum" "$archive" | sha256sum --check --status
    python3 - "$archive" <<'PY'
import sys
import tarfile
from pathlib import PurePosixPath

with tarfile.open(sys.argv[1], "r:gz") as archive:
    for member in archive:
        path = PurePosixPath(member.name)
        if path.is_absolute() or ".." in path.parts or not (member.isfile() or member.isdir()):
            raise SystemExit("Unsafe release archive entry")
PY
    mkdir -m 0755 "$staging/build"
    tar -xzf "$archive" --no-same-owner --no-same-permissions -C "$staging/build"
    [[ -s "$staging/build/index.html" ]]
    mv -T -- "$staging/build" "$release"
fi

expected=$(printf '{"commit":"%s","apiBaseUrl":"%s"}' "$commit" "$api")
[[ $(cat "$release/qa-release.json") == "$expected" ]]
grep -rF --include='*.js' "$api" "$release/static/js" >/dev/null

ln -s -- "$release" "$next_link"
mv -Tf -- "$next_link" "$live"
if local_release=$(curl -fsS --max-time 10 --resolve qa.coecmamsupport.com:443:127.0.0.1 "$site/qa-release.json") &&
   [[ $local_release == "$expected" ]] &&
   curl -fsS --max-time 10 --resolve qa.coecmamsupport.com:443:127.0.0.1 "$site/auth/login" |
       grep -F '<div id="root">' >/dev/null; then
    printf 'SAM QA frontend deployed %s (%s)\n' "$commit" "$checksum"
else
    ln -s -- "$previous" "$next_link"
    mv -Tf -- "$next_link" "$live"
    echo 'Frontend health check failed. Restored the previous frontend.' >&2
    exit 1
fi

# Keep the live and prior releases. Expire only directories created by this installer.
for old in "$releases"/*; do
    name=${old##*/}
    if [[ -d $old && ! -L $old && $name =~ ^[0-9a-f]{40}-[0-9a-f]{64}$ && $old != "$release" && $old != "$previous" ]]; then
        rm -r -- "$old"
    fi
done
