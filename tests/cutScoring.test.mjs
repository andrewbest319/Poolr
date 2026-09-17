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

const scoring = loadTsModule("lib/cutScoring.ts");

test("cut-adjusted total uses the worst active tournament total plus one", () => {
  const scores = [
    { player_name: "Leader", total_score: -8, status: "Live" },
    { player_name: "Worst Active", total_score: 5, status: "Finished" },
    { player_name: "Missed Cut", total_score: 9, status: "CUT" },
  ];

  assert.equal(scoring.cutAdjustedTournamentTotal(scores), 6);
  assert.equal(scoring.adjustedLiveTotalScore(scores[2], 6), 6);
});

test("withdrawals and disqualifications are excluded from the cut-adjusted floor", () => {
  const scores = [
    { player_name: "Active", total_score: 4, status: "Finished" },
    { player_name: "Withdrawn", total_score: null, status: "WD" },
    { player_name: "Disqualified", total_score: -2, position: "DQ" },
  ];

  assert.equal(scoring.cutAdjustedTournamentTotal(scores), 5);
  assert.equal(scoring.isWithdrawnOrDisqualified(scores[1]), true);
  assert.equal(scoring.isWithdrawnOrDisqualified(scores[2]), true);
  assert.equal(scoring.adjustedLiveTotalScore(scores[1], 5), null);
  assert.equal(scoring.adjustedLiveTotalScore(scores[2], 5), -2);
});
