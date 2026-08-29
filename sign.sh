#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly REPOSITORY="pamelanitschke75-cyber/Sol-Holo-"
readonly KEY_ALIAS="sol-holo-update"
readonly PRIVATE_DIR="${PWD}/.sol-holo-private"
readonly KEYSTORE_FILE="${PRIVATE_DIR}/Sol-Holo-Update-Key.jks"
readonly WORKFLOW_FILE="android-build.yml"

TEMPORARY_GH_LOGIN="false"
AUTHENTICATED_USER=""

gh_user() {
  env -u GH_TOKEN -u GITHUB_TOKEN gh "$@"
}

cleanup() {
  SIGNING_PASSWORD=""
  SIGNING_PASSWORD_REPEAT=""

  if [[ "$TEMPORARY_GH_LOGIN" == "true" ]]; then
    gh_user auth logout \
      --hostname github.com \
      --user "${AUTHENTICATED_USER:-pamelanitschke75-cyber}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

fail() {
  printf '\nFEHLER: %s\n' "$1" >&2
  exit 1
}

command -v gh >/dev/null 2>&1 || fail "GitHub CLI (gh) wurde nicht gefunden."
command -v keytool >/dev/null 2>&1 || fail "Java keytool wurde nicht gefunden."
command -v base64 >/dev/null 2>&1 || fail "base64 wurde nicht gefunden."
command -v grep >/dev/null 2>&1 || fail "grep wurde nicht gefunden."

if ! gh_user auth status --hostname github.com >/dev/null 2>&1; then
  printf '%s\n' \
    "GitHub benötigt einmalig deine persönliche Freigabe für die geschützten Signaturwerte." \
    "Es wird kein GitHub-Passwort und kein Zugangsschlüssel im Terminal eingegeben." \
    "Für Codespaces auf dem Handy wird der Browser nicht automatisch geöffnet." \
    "Bitte verwende nur die offizielle GitHub-Geräteaktivierung und gib den angezeigten Einmalcode dort selbst ein."

  GH_BROWSER=echo gh_user auth login \
    --hostname github.com \
    --git-protocol https \
    --web \
    --scopes "repo,workflow" \
    --skip-ssh-key

  TEMPORARY_GH_LOGIN="true"
fi

AUTHENTICATED_USER="$(gh_user api user --jq .login)"

if [[ "$AUTHENTICATED_USER" != "pamelanitschke75-cyber" ]]; then
  fail "GitHub ist nicht mit dem Projektkonto pamelanitschke75-cyber verbunden."
fi

printf '%s\n' \
  "SOL HOLO – dauerhafte Android-Update-Signatur" \
  "" \
  "Dein Passwort wird unsichtbar eingegeben." \
  "Es erscheint nicht im Chat, nicht im Git-Verlauf und nicht in den Build-Protokollen." \
  "Bitte speichere es selbst sicher ab."

while true; do
  IFS= read -r -s -p "Signatur-Passwort (mindestens 12 Zeichen): " SIGNING_PASSWORD
  printf '\n'

  if (( ${#SIGNING_PASSWORD} < 12 )); then
    printf '%s\n' "Das Passwort ist zu kurz. Bitte mindestens 12 Zeichen verwenden."
    continue
  fi

  IFS= read -r -s -p "Dasselbe Passwort noch einmal: " SIGNING_PASSWORD_REPEAT
  printf '\n'

  if [[ "$SIGNING_PASSWORD" != "$SIGNING_PASSWORD_REPEAT" ]]; then
    printf '%s\n' "Die beiden Eingaben stimmen nicht überein. Bitte noch einmal."
    SIGNING_PASSWORD=""
    SIGNING_PASSWORD_REPEAT=""
    continue
  fi

  SIGNING_PASSWORD_REPEAT=""
  break
done

mkdir -p "$PRIVATE_DIR"
chmod 700 "$PRIVATE_DIR"

if [[ -f "$KEYSTORE_FILE" ]]; then
  printf '%s\n' "Vorhandener Sol-Holo-Schlüssel gefunden. Er wird sicher weiterverwendet."
  keytool -list \
    -keystore "$KEYSTORE_FILE" \
    -storepass "$SIGNING_PASSWORD" \
    -alias "$KEY_ALIAS" >/dev/null 2>&1 \
    || fail "Das Passwort passt nicht zum vorhandenen Sol-Holo-Schlüssel. Nichts wurde verändert."
else
  keytool -genkeypair \
    -keystore "$KEYSTORE_FILE" \
    -storetype JKS \
    -storepass "$SIGNING_PASSWORD" \
    -keypass "$SIGNING_PASSWORD" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 4096 \
    -validity 10000 \
    -dname "CN=Sol Holo, O=Sol Holo, C=DE" >/dev/null 2>&1
  chmod 600 "$KEYSTORE_FILE"
  printf '%s\n' "Neuer dauerhafter Sol-Holo-Schlüssel wurde lokal erzeugt."
fi

printf '%s' "$SIGNING_PASSWORD" \
  | gh_user secret set SOL_HOLO_KEYSTORE_PASSWORD --repo "$REPOSITORY"
printf '%s' "$SIGNING_PASSWORD" \
  | gh_user secret set SOL_HOLO_KEY_PASSWORD --repo "$REPOSITORY"
printf '%s' "$KEY_ALIAS" \
  | gh_user secret set SOL_HOLO_KEY_ALIAS --repo "$REPOSITORY"
base64 --wrap=0 "$KEYSTORE_FILE" \
  | gh_user secret set SOL_HOLO_KEYSTORE_BASE64 --repo "$REPOSITORY"

required_secrets=(
  SOL_HOLO_KEYSTORE_BASE64
  SOL_HOLO_KEYSTORE_PASSWORD
  SOL_HOLO_KEY_ALIAS
  SOL_HOLO_KEY_PASSWORD
)

secret_names="$(gh_user secret list --repo "$REPOSITORY" --json name --jq '.[].name')"
for secret_name in "${required_secrets[@]}"; do
  grep -Fxq "$secret_name" <<<"$secret_names" \
    || fail "GitHub hat ${secret_name} nicht bestätigt."
done

gh_user workflow run "$WORKFLOW_FILE" --repo "$REPOSITORY" --ref main

printf '\n%s\n' "FERTIG: Die vier Signaturwerte liegen geschützt in GitHub Actions."
printf '%s\n' "Der erste dauerhaft signierte Sol-Holo-Update-Build wurde gestartet."
printf '\n%s\n' "WICHTIG: Bewahre diese Datei zusätzlich sicher auf:"
printf '%s\n' "$KEYSTORE_FILE"
printf '%s\n' "Das Passwort wird absichtlich nirgendwo als Datei gespeichert."
