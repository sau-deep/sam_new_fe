#!/usr/bin/env bash
set -euo pipefail

build=${1:?Usage: deploy.sh BUILD_DIR COMMIT}
commit=${2:?Usage: deploy.sh BUILD_DIR COMMIT}
[[ -s "$build/index.html" && $commit =~ ^[0-9a-f]{40}$ ]] || exit 2

api=https://qa-api.coecmamsupport.com
site=https://qa.coecmamsupport.com
grep -rF --include='*.js' "$api" "$build/static/js" >/dev/null
if grep -rF --include='*.js' "https://api.coecmamsupport.com" "$build/static/js" >/dev/null; then
    echo 'The QA bundle contains the production API URL.' >&2
    exit 1
fi
printf '{"commit":"%s","apiBaseUrl":"%s"}\n' "$commit" "$api" > "$build/qa-release.json"

export AWS_DEFAULT_REGION=ap-south-1 AWS_PAGER=
bucket=sam-hotspot-qa-017820702885-ap-south-1
instance=i-06fd4e493d816ab38
archive=$(mktemp)
trap 'rm -- "$archive"' EXIT
tar -czf "$archive" -C "$build" .
checksum=$(sha256sum "$archive")
checksum=${checksum%% *}
aws s3api put-object --bucket "$bucket" --key "deployments/frontend/$commit/$checksum.tar.gz" \
    --body "$archive" --server-side-encryption AES256 >/dev/null
command_id=$(aws ssm send-command --document-name SamHotspotQaFrontendDeploy --instance-ids "$instance" \
    --parameters "Commit=$commit,Checksum=$checksum" --query Command.CommandId --output text)
printf 'SSM command %s\n' "$command_id"

for ((attempt = 0; attempt < 65; attempt++)); do
    status=$(aws ssm get-command-invocation --command-id "$command_id" --instance-id "$instance" \
        --query Status --output text 2>&1) || {
        if [[ $status == *InvocationDoesNotExist* ]]; then
            sleep 5
            continue
        fi
        printf '%s\n' "$status" >&2
        exit 1
    }
    case "$status" in
        Pending|InProgress|Delayed|Cancelling) sleep 5 ;;
        *) break ;;
    esac
done
aws ssm get-command-invocation --command-id "$command_id" --instance-id "$instance" \
    --query '{Status:Status,Output:StandardOutputContent,Error:StandardErrorContent}'
[[ $status == Success ]]

release=$(curl -fsS --max-time 10 "$site/qa-release.json")
[[ $release == "$(cat "$build/qa-release.json")" ]]
curl -fsS --max-time 10 "$site/auth/login" | grep -F '<div id="root">' >/dev/null
curl -fsS --max-time 10 "$api/health/db-connection" |
    grep -Eq '"status"[[:space:]]*:[[:space:]]*"healthy"'
printf 'Frontend %s is live at %s and targets %s\n' "$commit" "$site" "$api"
