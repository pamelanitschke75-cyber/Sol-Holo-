import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverSource = await readFile(
  new URL("../server.mjs", import.meta.url),
  "utf8"
);

const milestoneSource = await readFile(
  new URL(
    "../MEILENSTEIN-HEY-PAM-S23-PRAXISTEST-03-09-2026.md",
    import.meta.url
  ),
  "utf8"
);

test("jede persönliche Holo-Instanz besitzt ihren eigenen Wecknamen", () => {
  assert.match(
    serverSource,
    /"pam-sol": Object\.freeze\(\{[\s\S]*?wakePhrase: "Hey Pam"/u
  );
  assert.match(
    serverSource,
    /"steffi-sol": Object\.freeze\(\{[\s\S]*?wakePhrase: "Hey Steffi"/u
  );
});

test("Realtime und Text erhalten dieselbe verbindliche Weckrufregel", () => {
  const instructionInsertions = serverSource.match(
    /\$\{personalWakePhraseInstructions\(identity\)\}/gu
  ) || [];

  assert.equal(instructionInsertions.length, 2);
  assert.match(
    serverSource,
    /Der einzige offizielle Weckruf[\s\S]*?„\$\{profile\.wakePhrase\}“/u
  );
  assert.match(
    serverSource,
    /Sol ist der Name der Assistentin, nicht der persönliche Weckname/u
  );
  assert.match(
    serverSource,
    /Fordere \$\{profile\.displayName\} niemals[\s\S]*?„beide“ auszuprobieren/u
  );
});

test("der von Pam bestätigte S23-Praxistest bleibt als Meilenstein dokumentiert", () => {
  assert.match(milestoneSource, /„Hey Pam“ funktioniert/u);
  assert.match(milestoneSource, /direkt ein zweites Mal wiederholt/u);
  assert.match(milestoneSource, /Sol bleibt der Name der Assistentin/u);
  assert.match(
    milestoneSource,
    /„Hey Sol“, „Hallo Sol“ und „Hello Sol“ sind keine alternativen Weckrufe/u
  );
});
