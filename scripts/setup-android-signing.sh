#!/usr/bin/env bash

set -Eeuo pipefail

ALIAS="sol-holo"
BACKUP_DIR="SOL-HOLO-SIGNING-BACKUP"
KEYSTORE_PATH="${BACKUP_DIR}/sol-holo-release.jks"

fail() {
  printf '\nFEHLER: %s\n' "$1" >&2
  exit 1
}

if ! command -v gh >/dev/null 2>&1; then
  fail "GitHub CLI (gh) wurde in diesem Codespace nicht gefunden."
fi

if ! gh auth status >/dev/null 2>&1; then
  fail "Der Codespace ist nicht mit GitHub verbunden."
fi

KEYTOOL="$(command -v keytool || true)"
if [[ -z "$KEYTOOL" && -x "/usr/local/sdkman/candidates/java/current/bin/keytool" ]]; then
  KEYTOOL="/usr/local/sdkman/candidates/java/current/bin/keytool"
fi

if [[ -z "$KEYTOOL" ]]; then
  fail "Java keytool wurde nicht gefunden."
fi

if [[ -e "$KEYSTORE_PATH" ]]; then
  fail "Es existiert bereits ein lokaler Signierschlüssel. Es wurde nichts überschrieben."
fi

printf '\nSol Holo – dauerhaften Android-Signierschlüssel erstellen\n'
printf 'Das Passwort bleibt unsichtbar und wird nicht ausgegeben.\n\n'

read -r -s -p "Eigenes Signier-Passwort (mindestens 20 Zeichen): " SIGNING_PASSWORD
printf '\n'

if (( ${#SIGNING_PASSWORD} < 20 )); then
  unset SIGNING_PASSWORD
  fail "Das Passwort ist kürzer als 20 Zeichen."
fi

printf 'Die Eingabe enthält %s Zeichen.\n' "${#SIGNING_PASSWORD}"
read -r -p "Ist dieses Passwort sicher gespeichert? Tippe JA: " PASSWORD_CONFIRMED

if [[ "${PASSWORD_CONFIRMED^^}" != "JA" ]]; then
  unset SIGNING_PASSWORD PASSWORD_CONFIRMED
  fail "Vorgang wurde ohne Änderung beendet."
fi

unset PASSWORD_CONFIRMED
umask 077
mkdir -p "$BACKUP_DIR"
export SOL_HOLO_SIGNING_PASSWORD="$SIGNING_PASSWORD"

"$KEYTOOL" -genkeypair \
  -keystore "$KEYSTORE_PATH" \
  -storetype PKCS12 \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 4096 \
  -validity 36500 \
  -storepass:env SOL_HOLO_SIGNING_PASSWORD \
  -keypass:env SOL_HOLO_SIGNING_PASSWORD \
  -dname "CN=Sol Holo, OU=SH, O=Pamela Nitschke, C=DE" \
  >/dev/null

printf '%s' "$SIGNING_PASSWORD" | gh secret set ANDROID_SIGNING_PASSWORD
base64 -w 0 "$KEYSTORE_PATH" | gh secret set ANDROID_KEYSTORE_BASE64

CERT_FINGERPRINT="$(
  "$KEYTOOL" -list -v \
    -keystore "$KEYSTORE_PATH" \
    -alias "$ALIAS" \
    -storepass:env SOL_HOLO_SIGNING_PASSWORD \
    | sed -n 's/^[[:space:]]*SHA256: /SHA256: /p' \
    | head -n 1
)"

unset SIGNING_PASSWORD SOL_HOLO_SIGNING_PASSWORD

printf '\nDer feste Signierschlüssel wurde erstellt.\n'
printf 'Die zwei verschlüsselten GitHub-Secrets wurden hinterlegt.\n'
printf 'WICHTIG: Lade den Ordner %s als private Sicherung herunter.\n' "$BACKUP_DIR"
printf 'Der Schlüssel oder das Passwort dürfen niemals veröffentlicht oder in einen Commit aufgenommen werden.\n\n'
printf 'Öffentlicher Zertifikat-Fingerabdruck: %s\n\n' "$CERT_FINGERPRINT"
