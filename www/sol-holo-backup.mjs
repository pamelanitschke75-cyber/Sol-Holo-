import {
  BACKUP_MAX_BYTES,
  BACKUP_MIN_PASSWORD_LENGTH,
  BACKUP_OWNER_ID,
  EXCLUDED_BACKUP_CATEGORIES,
  applyBackupRestore,
  backupFileName,
  createBackupSnapshot,
  decryptBackup,
  encryptBackup,
  planBackupRestore
} from "./sol-holo-backup-core.mjs";

const state = {
  selectedFileName: "",
  selectedFileContents: "",
  restorePlan: null
};

function currentIdentity() {
  const identity = window.SolHoloIdentity?.selected?.();
  return identity?.ownerId === BACKUP_OWNER_ID ? identity : null;
}

function backupPlugin() {
  return window.Capacitor?.Plugins?.SolBackup || null;
}

function setStatus(message, kind = "info") {
  const status = document.getElementById("solBackupStatus");
  if (!status) return;
  status.textContent = String(message || "");
  status.dataset.kind = kind;
}

function setBusy(busy) {
  document.querySelectorAll("[data-sol-backup-action]").forEach((button) => {
    button.disabled = Boolean(busy);
  });
  document.getElementById("solBackupDialog")?.setAttribute(
    "aria-busy",
    String(Boolean(busy))
  );
}

function clearPasswords() {
  for (const id of [
    "solBackupPassword",
    "solBackupPasswordConfirm",
    "solRestorePassword"
  ]) {
    const input = document.getElementById(id);
    if (input) input.value = "";
  }
}

function openDialog() {
  const identity = currentIdentity();
  if (!identity) {
    window.SolHoloIdentity?.require?.();
    return;
  }
  const overlay = document.getElementById("solBackupOverlay");
  if (!overlay) return;
  overlay.hidden = false;
  document.body.classList.add("solBackupOpen");
  document.getElementById("solBackupClose")?.focus();
}

function closeDialog() {
  const overlay = document.getElementById("solBackupOverlay");
  if (!overlay) return;
  overlay.hidden = true;
  document.body.classList.remove("solBackupOpen");
  clearPasswords();
  setStatus("");
  document.getElementById("settingsBackupButton")?.focus();
}

function browserDownload(fileName, contents) {
  const blob = new Blob([contents], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

async function saveEncryptedFile(fileName, contents) {
  const plugin = backupPlugin();
  if (plugin?.saveEncryptedBackup) {
    const result = await plugin.saveEncryptedBackup({ fileName, contents });
    if (result?.saved !== true) {
      throw new Error("Android hat die Sicherungsdatei nicht bestätigt.");
    }
    return;
  }
  browserDownload(fileName, contents);
}

async function createEncryptedBackup() {
  const identity = currentIdentity();
  if (!identity) {
    throw new Error("Pams feste Holo-ID ist nicht aktiv.");
  }
  const password = document.getElementById("solBackupPassword")?.value || "";
  const confirmation =
    document.getElementById("solBackupPasswordConfirm")?.value || "";
  if (password !== confirmation) {
    throw new Error("Die beiden Sicherungspasswörter stimmen nicht überein.");
  }

  setBusy(true);
  setStatus("Lokale Daten werden verschlüsselt …");
  try {
    const snapshot = createBackupSnapshot(localStorage);
    const encrypted = await encryptBackup(snapshot, password);
    const fileName = backupFileName();
    await saveEncryptedFile(fileName, encrypted);
    clearPasswords();
    setStatus(
      `Sicherung gespeichert: ${snapshot.data.notes.length} Notizen, ` +
      `${snapshot.data.pendingDialogs.length} noch nicht synchronisierte Dialoge.`,
      "success"
    );
  } finally {
    setBusy(false);
  }
}

function readBrowserFile(file) {
  if (!file) return Promise.reject(new Error("Keine Sicherungsdatei ausgewählt."));
  if (file.size > BACKUP_MAX_BYTES) {
    return Promise.reject(new Error("Die Sicherungsdatei ist größer als 12 MB."));
  }
  return file.text().then((contents) => ({
    fileName: file.name,
    contents
  }));
}

async function chooseBackupFile() {
  const plugin = backupPlugin();
  if (plugin?.openEncryptedBackup) {
    const result = await plugin.openEncryptedBackup();
    if (!result?.contents) {
      throw new Error("Die ausgewählte Sicherungsdatei ist leer.");
    }
    return {
      fileName: String(result.fileName || "Sol-Holo-Sicherung"),
      contents: String(result.contents)
    };
  }

  return new Promise((resolve, reject) => {
    const input = document.getElementById("solBackupFileInput");
    const cleanup = () => {
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
    };
    const onChange = async () => {
      try {
        resolve(await readBrowserFile(input.files?.[0]));
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
        input.value = "";
      }
    };
    const onCancel = () => {
      cleanup();
      reject(new Error("Dateiauswahl abgebrochen."));
    };
    input.addEventListener("change", onChange);
    input.addEventListener("cancel", onCancel);
    input.click();
  });
}

async function selectRestoreFile() {
  setBusy(true);
  setStatus("Sicherungsdatei wird geöffnet …");
  try {
    const file = await chooseBackupFile();
    if (new TextEncoder().encode(file.contents).byteLength > BACKUP_MAX_BYTES) {
      throw new Error("Die Sicherungsdatei ist größer als 12 MB.");
    }
    state.selectedFileName = file.fileName;
    state.selectedFileContents = file.contents;
    state.restorePlan = null;
    document.getElementById("solBackupSelectedFile").textContent = file.fileName;
    setStatus("Datei ausgewählt. Gib jetzt ihr Sicherungspasswort ein.", "success");
    document.getElementById("solRestorePassword")?.focus();
  } finally {
    setBusy(false);
  }
}

function restoreSummaryText(plan) {
  const summary = plan.summary;
  const date = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(plan.createdAt));
  return [
    `Sicherung vom ${date}`,
    `${summary.notesAdded} neue und ${summary.notesUpdated} aktualisierte Notizen`,
    `${summary.pendingAdded} noch nicht synchronisierte Dialoge ergänzt`,
    `${summary.settingsRestored} lokale Einstellungen`,
    "Bestehende Einträge werden nicht gelöscht."
  ].join("\n");
}

async function verifyAndRestore() {
  if (!state.selectedFileContents) {
    throw new Error("Bitte wähle zuerst eine Sicherungsdatei aus.");
  }
  const password = document.getElementById("solRestorePassword")?.value || "";
  setBusy(true);
  setStatus("Passwort und Integrität werden geprüft …");
  try {
    const snapshot = await decryptBackup(state.selectedFileContents, password);
    const plan = planBackupRestore(localStorage, snapshot);
    state.restorePlan = plan;
    const summary = restoreSummaryText(plan);
    setStatus(summary, "success");
    const confirmed = window.confirm(
      `${summary}\n\nMöchtest du diese Kopie jetzt in Pam’s Holo wiederherstellen?`
    );
    if (!confirmed) {
      setStatus("Sicherung geprüft. Es wurde noch nichts verändert.");
      return;
    }
    applyBackupRestore(localStorage, plan);
    clearPasswords();
    setStatus("Wiederherstellung abgeschlossen. Pam’s Holo startet neu …", "success");
    window.setTimeout(() => window.location.reload(), 700);
  } finally {
    setBusy(false);
  }
}

function markup() {
  const exclusions = EXCLUDED_BACKUP_CATEGORIES
    .map((category) => `<li>${category}</li>`)
    .join("");
  return `
    <div id="solBackupOverlay" class="solBackupOverlay" hidden>
      <section id="solBackupDialog" class="solBackupDialog glassCard"
        role="dialog" aria-modal="true" aria-labelledby="solBackupTitle">
        <header class="solBackupHeader">
          <div>
            <p class="eyebrow">Privat, lokal, verschlüsselt</p>
            <h2 id="solBackupTitle">Sicherung &amp; Wiederherstellung</h2>
          </div>
          <button id="solBackupClose" class="iconButton" type="button"
            aria-label="Sicherung schließen" data-sol-backup-action>×</button>
        </header>

        <p class="solBackupLead">
          Erzeugt eine verschlüsselte Kopie deiner lokalen Notizen,
          noch nicht synchronisierten Dialoge und App-Auswahl. Dein
          owner-gebundenes Servergedächtnis bleibt davon unberührt erhalten.
        </p>

        <section class="solBackupCard" aria-labelledby="solBackupCreateTitle">
          <h3 id="solBackupCreateTitle">Neue Sicherung</h3>
          <label for="solBackupPassword">
            Eigenes Sicherungspasswort (mindestens ${BACKUP_MIN_PASSWORD_LENGTH} Zeichen)
          </label>
          <input id="solBackupPassword" type="password" minlength="${BACKUP_MIN_PASSWORD_LENGTH}"
            autocomplete="off" spellcheck="false">
          <label for="solBackupPasswordConfirm">Passwort wiederholen</label>
          <input id="solBackupPasswordConfirm" type="password"
            minlength="${BACKUP_MIN_PASSWORD_LENGTH}" autocomplete="off"
            spellcheck="false">
          <button id="solBackupCreate" class="primaryButton" type="button"
            data-sol-backup-action>Verschlüsselte Kopie speichern</button>
          <p class="solBackupHint">
            Das Passwort wird nicht gespeichert und kann von Sol nicht
            wiederhergestellt werden. Bewahre es getrennt von der Datei auf.
          </p>
        </section>

        <section class="solBackupCard" aria-labelledby="solBackupRestoreTitle">
          <h3 id="solBackupRestoreTitle">Vorhandene Sicherung</h3>
          <input id="solBackupFileInput" type="file"
            accept=".solholo-backup,application/json,application/octet-stream" hidden>
          <button id="solBackupSelect" class="secondaryButton" type="button"
            data-sol-backup-action>Sicherungsdatei auswählen</button>
          <p id="solBackupSelectedFile" class="solBackupFileName">Noch keine Datei ausgewählt</p>
          <label for="solRestorePassword">Sicherungspasswort</label>
          <input id="solRestorePassword" type="password"
            minlength="${BACKUP_MIN_PASSWORD_LENGTH}" autocomplete="off"
            spellcheck="false">
          <button id="solBackupRestore" class="primaryButton" type="button"
            data-sol-backup-action>Sicherung prüfen und wiederherstellen</button>
          <p class="solBackupHint">
            Vor jeder Änderung siehst du eine Zusammenfassung und bestätigst
            sie. Vorhandene Notizen und Dialoge werden nicht gelöscht.
          </p>
        </section>

        <details class="solBackupExclusions">
          <summary>Was absichtlich nie in dieser Datei liegt</summary>
          <ul>${exclusions}</ul>
        </details>
        <p id="solBackupStatus" class="solBackupStatus" role="status" aria-live="polite"></p>
      </section>
    </div>`;
}

function installUi() {
  const settingsMemoryButton = document.getElementById("settingsMemoryButton");
  const actionList = settingsMemoryButton?.closest(".settingsActionList");
  if (!actionList || document.getElementById("settingsBackupButton")) return;

  const button = document.createElement("button");
  button.id = "settingsBackupButton";
  button.className = "actionRow";
  button.type = "button";
  button.innerHTML = `
    <span class="rowIcon" aria-hidden="true">⇩</span>
    <span class="rowText">
      <span class="rowTitle">Sicherung &amp; Wiederherstellung</span>
      <span class="rowMeta">Verschlüsselte Kopie auf deinem Handy</span>
    </span>
    <span class="rowChevron" aria-hidden="true">›</span>`;
  actionList.appendChild(button);
  document.body.insertAdjacentHTML("beforeend", markup());

  button.addEventListener("click", openDialog);
  document.getElementById("solBackupClose")?.addEventListener("click", closeDialog);
  document.getElementById("solBackupOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "solBackupOverlay") closeDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.getElementById("solBackupOverlay")?.hidden) {
      closeDialog();
    }
  });
  document.getElementById("solBackupCreate")?.addEventListener("click", () => {
    void createEncryptedBackup().catch((error) => setStatus(error.message, "error"));
  });
  document.getElementById("solBackupSelect")?.addEventListener("click", () => {
    void selectRestoreFile().catch((error) => {
      if (String(error?.message || "").toLowerCase().includes("abgebrochen")) {
        setStatus("Dateiauswahl abgebrochen.");
        return;
      }
      setStatus(error.message, "error");
    });
  });
  document.getElementById("solBackupRestore")?.addEventListener("click", () => {
    void verifyAndRestore().catch((error) => setStatus(error.message, "error"));
  });
}

installUi();
