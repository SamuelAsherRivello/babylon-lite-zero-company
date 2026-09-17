import assert from "node:assert/strict";
import test from "node:test";

import * as rules from "../../src/game/rules/index.js";

function requireExport(name, type = null) {
  assert.ok(name in rules, `Rules API must export ${name}.`);
  if (type) {
    assert.equal(typeof rules[name], type, `${name} must be a ${type}.`);
  }
  return rules[name];
}

function openLevel(level) {
  return { ...level, covers: [] };
}

test("defines one-AP short and balanced shots and a two-AP long shot", () => {
  const weapons = requireExport("WEAPON_DEFINITIONS", "object");

  assert.deepEqual(Object.keys(weapons).sort(), ["balanced", "long", "short"]);
  assert.equal(weapons.short.apCost, 1);
  assert.equal(weapons.balanced.apCost, 1);
  assert.equal(weapons.long.apCost, 2);
});

test("every weapon uses its authored maximums at orthogonally adjacent range", () => {
  const level = openLevel(requireExport("LEVEL_DEFINITION", "object"));
  const weapons = requireExport("WEAPON_DEFINITIONS", "object");
  const queryAttack = requireExport("queryAttack", "function");

  for (const weapon of Object.values(weapons)) {
    const preview = queryAttack({
      level,
      weaponId: weapon.id,
      shooterCell: { column: 4, row: 4 },
      targetCell: { column: 5, row: 4 },
      units: [],
    });
    assert.equal(preview.hitProbability, weapon.maxHitProbability);
    assert.equal(preview.maxDamage, weapon.maxDamage);
    assert.ok(preview.minDamage > 0);
    assert.ok(preview.minDamage <= preview.maxDamage);
    assert.equal(preview.selectable, true);
  }
});

test("uses Euclidean distance with monotonic hit and damage falloff", () => {
  const level = openLevel(requireExport("LEVEL_DEFINITION", "object"));
  const weapons = requireExport("WEAPON_DEFINITIONS", "object");
  const queryAttack = requireExport("queryAttack", "function");
  const adjacent = queryAttack({
    level,
    weaponId: "balanced",
    shooterCell: { column: 1, row: 1 },
    targetCell: { column: 2, row: 1 },
    units: [],
  });
  const diagonal = queryAttack({
    level,
    weaponId: "balanced",
    shooterCell: { column: 1, row: 1 },
    targetCell: { column: 2, row: 2 },
    units: [],
  });
  const distant = queryAttack({
    level,
    weaponId: "balanced",
    shooterCell: { column: 1, row: 1 },
    targetCell: { column: 4, row: 5 },
    units: [],
  });

  assert.equal(adjacent.distance, 1);
  assert.equal(diagonal.distance, Math.SQRT2);
  assert.equal(distant.distance, 5);
  assert.equal(adjacent.hitProbability, weapons.balanced.maxHitProbability);
  assert.equal(adjacent.maxDamage, weapons.balanced.maxDamage);
  assert.ok(diagonal.hitProbability < adjacent.hitProbability);
  assert.ok(diagonal.maxDamage < adjacent.maxDamage);
  assert.ok(distant.hitProbability < diagonal.hitProbability);
  assert.ok(distant.maxDamage < diagonal.maxDamage);
});

test("cover blocks line of sight while characters do not", () => {
  const baseLevel = requireExport("LEVEL_DEFINITION", "object");
  const hasLineOfSight = requireExport("hasLineOfSight", "function");
  const fromCell = { column: 1, row: 3 };
  const targetCell = { column: 5, row: 3 };
  const blockingUnit = {
    id: "bystander",
    health: 10,
    cell: { column: 3, row: 3 },
  };
  const defeatedUnit = {
    id: "defeated-bystander",
    health: 0,
    cell: { column: 4, row: 3 },
  };
  const open = openLevel(baseLevel);
  const blocked = {
    ...open,
    covers: [
      {
        id: "test-cover",
        cells: [
          { column: 3, row: 3 },
          { column: 4, row: 3 },
          { column: 3, row: 4 },
          { column: 4, row: 4 },
        ],
      },
    ],
  };

  assert.equal(
    hasLineOfSight({
      level: open,
      fromCell,
      targetCell,
      units: [blockingUnit, defeatedUnit],
    }),
    true,
  );
  assert.equal(
    hasLineOfSight({ level: blocked, fromCell, targetCell, units: [] }),
    false,
  );
});

test("blocked attack previews are unselectable with zero hit probability", () => {
  const baseLevel = requireExport("LEVEL_DEFINITION", "object");
  const queryAttack = requireExport("queryAttack", "function");
  const blockedLevel = {
    ...openLevel(baseLevel),
    covers: [
      {
        id: "test-cover",
        cells: [{ column: 3, row: 3 }],
      },
    ],
  };
  const attack = {
    weaponId: "short",
    shooterCell: { column: 1, row: 3 },
    targetCell: { column: 5, row: 3 },
    units: [
      { id: "living", health: 10, cell: { column: 2, row: 3 } },
      { id: "dead", health: 0, cell: { column: 4, row: 3 } },
    ],
  };
  const clear = queryAttack({ ...attack, level: openLevel(baseLevel) });
  const blocked = queryAttack({ ...attack, level: blockedLevel });

  assert.equal(clear.hasLineOfSight, true);
  assert.equal(clear.selectable, true);
  assert.ok(clear.hitProbability > 0);
  assert.equal(blocked.hasLineOfSight, false);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.selectable, false);
  assert.equal(blocked.hitProbability, 0);
  assert.equal(blocked.minDamage, 0);
  assert.equal(blocked.maxDamage, 0);
});

test("cover defense applies only from shooter-facing adjacent cover", () => {
  const baseLevel = requireExport("LEVEL_DEFINITION", "object");
  const queryAttack = requireExport("queryAttack", "function");
  const coveredLevel = {
    ...openLevel(baseLevel),
    covers: [
      {
        id: "test-cover",
        cells: [{ column: 4, row: 3 }],
      },
    ],
  };
  const defended = queryAttack({
    level: coveredLevel,
    weaponId: "balanced",
    shooterCell: { column: 2, row: 4 },
    targetCell: { column: 5, row: 4 },
    units: [],
  });
  const flanked = queryAttack({
    level: coveredLevel,
    weaponId: "balanced",
    shooterCell: { column: 7, row: 4 },
    targetCell: { column: 5, row: 4 },
    units: [],
  });
  const open = queryAttack({
    level: openLevel(baseLevel),
    weaponId: "balanced",
    shooterCell: { column: 2, row: 4 },
    targetCell: { column: 5, row: 4 },
    units: [],
  });

  assert.equal(defended.hasLineOfSight, true);
  assert.equal(defended.selectable, true);
  assert.equal(defended.baseHitProbability, open.hitProbability);
  assert.equal(defended.coverDefense.active, true);
  assert.equal(defended.coverDefense.reduction, 0.2);
  assert.equal(defended.hitProbability, Number((open.hitProbability - 0.2).toFixed(6)));
  assert.deepEqual(
    defended.terrainModifiers.map((modifier) => modifier.id),
    ["cover-defense"],
  );

  assert.equal(flanked.coverDefense.active, false);
  assert.equal(flanked.hitProbability, flanked.baseHitProbability);
  assert.deepEqual(flanked.terrainModifiers, []);
});

test("cover defense keeps legal low-probability shots selectable at five percent", () => {
  const baseLevel = requireExport("LEVEL_DEFINITION", "object");
  const queryAttack = requireExport("queryAttack", "function");
  const level = {
    ...openLevel(baseLevel),
    covers: [
      {
        id: "test-cover",
        cells: [{ column: 10, row: 3 }],
      },
    ],
  };
  const preview = queryAttack({
    level,
    weaponId: "short",
    shooterCell: { column: 0, row: 4 },
    targetCell: { column: 11, row: 4 },
    units: [],
  });

  assert.equal(preview.hasLineOfSight, true);
  assert.equal(preview.selectable, true);
  assert.equal(preview.coverDefense.active, true);
  assert.equal(preview.hitProbability, 0.05);
});

test("attack resolution consumes the exact shared preview calculation", () => {
  const level = openLevel(requireExport("LEVEL_DEFINITION", "object"));
  const queryAttack = requireExport("queryAttack", "function");
  const resolveAttack = requireExport("resolveAttack", "function");
  const createScriptedRandom = requireExport("createScriptedRandom", "function");
  const attack = {
    level,
    weaponId: "balanced",
    shooterCell: { column: 1, row: 1 },
    targetCell: { column: 3, row: 2 },
    units: [],
  };
  const preview = queryAttack(attack);
  const resolution = resolveAttack({
    ...attack,
    randomSource: createScriptedRandom([0, 0.5]),
  });

  assert.deepEqual(resolution.preview, preview);
  assert.equal(resolution.hit, true);
  assert.ok(resolution.damage >= preview.minDamage);
  assert.ok(resolution.damage <= preview.maxDamage);
  assert.equal(resolution.randomSource.index, 2);
});

test("attack resolution uses the same cover-adjusted preview probability", () => {
  const baseLevel = requireExport("LEVEL_DEFINITION", "object");
  const queryAttack = requireExport("queryAttack", "function");
  const resolveAttack = requireExport("resolveAttack", "function");
  const createScriptedRandom = requireExport("createScriptedRandom", "function");
  const level = {
    ...openLevel(baseLevel),
    covers: [
      {
        id: "test-cover",
        cells: [{ column: 4, row: 3 }],
      },
    ],
  };
  const attack = {
    level,
    weaponId: "balanced",
    shooterCell: { column: 2, row: 4 },
    targetCell: { column: 5, row: 4 },
    units: [],
  };
  const preview = queryAttack(attack);
  const miss = resolveAttack({
    ...attack,
    randomSource: createScriptedRandom([preview.hitProbability]),
  });

  assert.deepEqual(miss.preview, preview);
  assert.equal(miss.hit, false);
  assert.equal(miss.hitRoll, preview.hitProbability);
});

test("seeded and scripted resolution are deterministic and stay within preview", () => {
  const level = openLevel(requireExport("LEVEL_DEFINITION", "object"));
  const resolveAttack = requireExport("resolveAttack", "function");
  const createSeededRandom = requireExport("createSeededRandom", "function");
  const createScriptedRandom = requireExport("createScriptedRandom", "function");
  const attack = {
    level,
    weaponId: "long",
    shooterCell: { column: 1, row: 1 },
    targetCell: { column: 5, row: 3 },
    units: [],
  };
  const first = resolveAttack({
    ...attack,
    randomSource: createSeededRandom(9876),
  });
  const second = resolveAttack({
    ...attack,
    randomSource: createSeededRandom(9876),
  });
  const forcedHit = resolveAttack({
    ...attack,
    randomSource: createScriptedRandom([0, 0.999]),
  });
  const forcedMiss = resolveAttack({
    ...attack,
    randomSource: createScriptedRandom([0.999]),
  });

  assert.deepEqual(second, first);
  assert.equal(forcedHit.hit, true);
  assert.equal(forcedHit.damage, forcedHit.preview.maxDamage);
  assert.ok(forcedHit.damage <= forcedHit.preview.maxDamage);
  assert.equal(forcedMiss.hit, false);
  assert.equal(forcedMiss.damage, 0);
  assert.equal(forcedMiss.randomSource.index, 1);
});
