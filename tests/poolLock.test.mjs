import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function loadTsModule(relativePath) {
  const filename = path.resolve(relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleShim = { exports: {} };

  vm.runInNewContext(
    output,
    { module: moduleShim, exports: moduleShim.exports },
    { filename }
  );

  return moduleShim.exports;
}

const locks = loadTsModule("lib/poolLock.ts");
const now = Date.parse("2026-04-10T12:00:00.000Z");

test("tournament status and timestamps lock picks", () => {
  assert.equal(locks.tournamentStatusLocksPicks("live"), true);
  assert.equal(locks.tournamentStatusLocksPicks("completed"), true);
  assert.equal(
    locks.isTournamentLocked({ lock_time: "2026-04-10T11:59:00.000Z" }, now),
    true
  );
  assert.equal(
    locks.isTournamentLocked({ lock_time: "2026-04-10T12:01:00.000Z" }, now),
    false
  );
});

test("manual lock honors later unlock timestamps", () => {
  assert.equal(locks.isPoolManuallyLocked({ is_locked: true }), true);
  assert.equal(
    locks.isPoolManuallyLocked({
      locked_at: "2026-04-10T10:00:00.000Z",
      unlocked_at: "2026-04-10T11:00:00.000Z",
    }),
    false
  );
  assert.equal(
    locks.isPoolManuallyLocked({
      locked_at: "2026-04-10T12:00:00.000Z",
      unlocked_at: "2026-04-10T11:00:00.000Z",
    }),
    true
  );
});
