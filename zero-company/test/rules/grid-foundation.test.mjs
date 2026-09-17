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

function cellKey(cell) {
  return `${cell.column},${cell.row}`;
}

function reachableCells(result) {
  return result.map((entry) => entry.cell ?? entry);
}

function normalizedFootprint(cells) {
  const minimumColumn = Math.min(...cells.map((cell) => cell.column));
  const minimumRow = Math.min(...cells.map((cell) => cell.row));
  return cells
    .map((cell) => ({
      column: cell.column - minimumColumn,
      row: cell.row - minimumRow,
    }))
    .sort((first, second) =>
      first.column === second.column
        ? first.row - second.row
        : first.column - second.column,
    );
}

test("defines one 13-column by 8-row one-unit grid", () => {
  const level = requireExport("LEVEL_DEFINITION", "object");

  assert.equal(level.columns, 13);
  assert.equal(level.rows, 8);
  assert.equal(level.cellSize, 1);
  assert.equal(level.arenaTop, 0.3);
});

test("defines the exact six starting cells", () => {
  const level = requireExport("LEVEL_DEFINITION", "object");

  assert.deepEqual(level.starts, {
    "player-1": { column: 2, row: 1 },
    "player-2": { column: 6, row: 1 },
    "player-3": { column: 10, row: 1 },
    "enemy-1": { column: 2, row: 6 },
    "enemy-2": { column: 6, row: 6 },
    "enemy-3": { column: 10, row: 6 },
  });
});

test("defines three distinct equal 2-by-2 cover footprints", () => {
  const level = requireExport("LEVEL_DEFINITION", "object");

  assert.equal(level.covers.length, 3);
  const occupiedKeys = new Set();
  const normalized = level.covers.map((cover) => {
    assert.equal(cover.cells.length, 4);
    assert.equal(new Set(cover.cells.map((cell) => cell.column)).size, 2);
    assert.equal(new Set(cover.cells.map((cell) => cell.row)).size, 2);

    for (const cell of cover.cells) {
      assert.ok(cell.column >= 0 && cell.column < level.columns);
      assert.ok(cell.row >= 0 && cell.row < level.rows);
      assert.equal(occupiedKeys.has(cellKey(cell)), false, "Cover cells cannot overlap.");
      occupiedKeys.add(cellKey(cell));
    }

    return normalizedFootprint(cover.cells);
  });

  assert.deepEqual(normalized[0], [
    { column: 0, row: 0 },
    { column: 0, row: 1 },
    { column: 1, row: 0 },
    { column: 1, row: 1 },
  ]);
  assert.deepEqual(normalized[1], normalized[0]);
  assert.deepEqual(normalized[2], normalized[0]);
});

test("maps cells to exact world centers", () => {
  const level = requireExport("LEVEL_DEFINITION", "object");
  const cellToWorld = requireExport("cellToWorld", "function");

  assert.deepEqual(cellToWorld({ column: 0, row: 0 }, level), {
    x: -6,
    y: level.arenaTop,
    z: -3.5,
  });
  assert.deepEqual(cellToWorld({ column: 6, row: 3 }, level), {
    x: 0,
    y: level.arenaTop,
    z: -0.5,
  });
  assert.deepEqual(cellToWorld({ column: 12, row: 7 }, level), {
    x: 6,
    y: level.arenaTop,
    z: 3.5,
  });
});

test("reports both living and dead unit cells as occupied", () => {
  const createInitialBattle = requireExport("createInitialBattle", "function");
  const getOccupiedCells = requireExport("getOccupiedCells", "function");
  const state = createInitialBattle({ seed: 12345 });
  state.units.find((unit) => unit.id === "player-1").health = 0;

  const occupied = getOccupiedCells(state);
  const occupiedKeys = new Set(occupied.map(cellKey));

  assert.equal(occupiedKeys.size, 6);
  for (const unit of state.units) {
    assert.equal(occupiedKeys.has(cellKey(unit.cell)), true);
  }
});

test("prevents diagonal movement through a blocked corner", () => {
  const level = requireExport("LEVEL_DEFINITION", "object");
  const findReachableCells = requireExport("findReachableCells", "function");
  const result = findReachableCells({
    level,
    origin: { column: 1, row: 1 },
    blockedCells: [
      { column: 2, row: 1 },
      { column: 1, row: 2 },
    ],
    maxSteps: 1,
  });
  const keys = new Set(reachableCells(result).map(cellKey));

  assert.equal(keys.has("2,2"), false);
});

test("uses equal-cost eight-direction reach of 3, 4, and 5 cells", () => {
  const level = requireExport("LEVEL_DEFINITION", "object");
  const movement = requireExport("MOVEMENT_PROFILE", "object");
  const getMovementAllowance = requireExport("getMovementAllowance", "function");
  const findReachableCells = requireExport("findReachableCells", "function");

  assert.equal(movement.base, 3.9);
  assert.deepEqual(movement.multipliers, { 1: 1, 2: 1.2, 3: 1.3 });
  assert.equal(Math.floor(movement.base * movement.multipliers[1]), 3);
  assert.equal(Math.floor(movement.base * movement.multipliers[2]), 4);
  assert.equal(Math.floor(movement.base * movement.multipliers[3]), 5);
  assert.equal(getMovementAllowance(1), 3);
  assert.equal(getMovementAllowance(2), 4);
  assert.equal(getMovementAllowance(3), 5);

  const origin = { column: 6, row: 1 };
  const oneAp = new Set(
    reachableCells(
      findReachableCells({ level, origin, blockedCells: [], maxSteps: 3 }),
    ).map(cellKey),
  );
  const twoAp = new Set(
    reachableCells(
      findReachableCells({ level, origin, blockedCells: [], maxSteps: 4 }),
    ).map(cellKey),
  );
  const threeAp = new Set(
    reachableCells(
      findReachableCells({ level, origin, blockedCells: [], maxSteps: 5 }),
    ).map(cellKey),
  );

  assert.equal(oneAp.has("9,4"), true, "Three diagonal steps cost one AP.");
  assert.equal(oneAp.has("10,2"), false);
  assert.equal(twoAp.has("10,2"), true, "Four equal-cost steps cost two AP.");
  assert.equal(twoAp.has("11,2"), false);
  assert.equal(threeAp.has("11,2"), true, "Five equal-cost steps cost three AP.");
});

test("reachable cells include their minimum AP tier and shortest center path", () => {
  const level = {
    ...requireExport("LEVEL_DEFINITION", "object"),
    covers: [],
  };
  const findReachableCells = requireExport("findReachableCells", "function");
  const result = findReachableCells({
    level,
    origin: { column: 6, row: 1 },
    blockedCells: [],
    maxSteps: 5,
  });
  const byCell = new Map(result.map((entry) => [cellKey(entry.cell), entry]));

  assert.equal(byCell.get("9,4").minimumActionPoints, 1);
  assert.equal(byCell.get("9,4").path.length, 3);
  assert.equal(byCell.get("10,5").minimumActionPoints, 2);
  assert.equal(byCell.get("10,5").path.length, 4);
  assert.equal(byCell.get("11,6").minimumActionPoints, 3);
  assert.equal(byCell.get("11,6").path.length, 5);
  assert.deepEqual(byCell.get("11,6").path.at(-1), {
    column: 11,
    row: 6,
  });
});

test("battle destinations exclude cover, living, and dead cells", () => {
  const level = requireExport("LEVEL_DEFINITION", "object");
  const createInitialBattle = requireExport("createInitialBattle", "function");
  const getBlockedCells = requireExport("getBlockedCells", "function");
  const getReachableDestinations = requireExport(
    "getReachableDestinations",
    "function",
  );
  const state = createInitialBattle({ seed: 12345 });
  state.units.find((unit) => unit.id === "player-2").health = 0;

  const blocked = new Set(
    getBlockedCells(state, level, { excludeUnitId: "player-1" }).map(cellKey),
  );
  const destinations = new Set(
    getReachableDestinations(state, "player-1", { level })
      .map((entry) => entry.cell)
      .map(cellKey),
  );

  assert.equal(blocked.has("6,1"), true, "A dead unit keeps blocking its cell.");
  assert.equal(blocked.has("10,1"), true, "A living unit blocks its cell.");
  for (const cover of level.covers) {
    for (const cell of cover.cells) {
      assert.equal(blocked.has(cellKey(cell)), true);
      assert.equal(destinations.has(cellKey(cell)), false);
    }
  }
  assert.equal(destinations.has("6,1"), false);
});

test("edge destinations remain in bounds and centered over complete cells", () => {
  const level = requireExport("LEVEL_DEFINITION", "object");
  const createInitialBattle = requireExport("createInitialBattle", "function");
  const cellToWorld = requireExport("cellToWorld", "function");
  const getReachableDestinations = requireExport(
    "getReachableDestinations",
    "function",
  );
  const state = createInitialBattle({ seed: 12345 });
  state.units.find((unit) => unit.id === "player-1").cell = {
    column: 0,
    row: 0,
  };

  const destinations = getReachableDestinations(state, "player-1", { level });
  assert.ok(destinations.length > 0);
  for (const destination of destinations) {
    const { column, row } = destination.cell;
    const world = cellToWorld(destination.cell, level);
    assert.ok(column >= 0 && column < level.columns);
    assert.ok(row >= 0 && row < level.rows);
    assert.ok(world.x - 0.5 >= -level.columns / 2);
    assert.ok(world.x + 0.5 <= level.columns / 2);
    assert.ok(world.z - 0.5 >= -level.rows / 2);
    assert.ok(world.z + 0.5 <= level.rows / 2);
  }
});

test("resolving movement spends only movement AP and never attacks", () => {
  const createInitialBattle = requireExport("createInitialBattle", "function");
  const resolveMove = requireExport("resolveMove", "function");
  const initial = createInitialBattle({ seed: 12345 });
  const healthBefore = initial.units.map(({ id, health }) => ({ id, health }));
  const outcome = resolveMove(initial, {
    unitId: "player-1",
    destination: { column: 3, row: 2 },
  });
  const movedUnit = outcome.state.units.find((unit) => unit.id === "player-1");

  assert.equal(outcome.accepted, true);
  assert.equal(outcome.cost, 1);
  assert.deepEqual(movedUnit.cell, { column: 3, row: 2 });
  assert.equal(movedUnit.actionPoints, 2);
  assert.deepEqual(outcome.path, [{ column: 3, row: 2 }]);
  assert.deepEqual(
    outcome.events.map((event) => event.type),
    ["move-started", "move-step", "move-completed"],
  );
  assert.deepEqual(outcome.events[1].from, { column: 2, row: 1 });
  assert.deepEqual(outcome.events[1].to, { column: 3, row: 2 });
  assert.deepEqual(
    outcome.state.units.map(({ id, health }) => ({ id, health })),
    healthBefore,
  );
  assert.equal(
    outcome.events.some((event) =>
      ["shot-resolved", "unit-damaged", "unit-defeated"].includes(event.type),
    ),
    false,
  );
});

test("resolveMove spends the displayed tier and rejects blocked destinations", () => {
  const level = requireExport("LEVEL_DEFINITION", "object");
  const createInitialBattle = requireExport("createInitialBattle", "function");
  const getReachableDestinations = requireExport(
    "getReachableDestinations",
    "function",
  );
  const resolveMove = requireExport("resolveMove", "function");
  const initial = createInitialBattle({ seed: 12345 });
  const destination = { column: 6, row: 2 };
  const displayed = getReachableDestinations(initial, "player-1", { level })
    .find((entry) => cellKey(entry.cell) === cellKey(destination));

  assert.equal(displayed.minimumActionPoints, 2);
  const moved = resolveMove(initial, { unitId: "player-1", destination, level });
  assert.equal(moved.cost, displayed.minimumActionPoints);
  assert.equal(
    moved.state.units.find((unit) => unit.id === "player-1").actionPoints,
    1,
  );

  const blocked = resolveMove(initial, {
    unitId: "player-1",
    destination: level.covers[0].cells[0],
    level,
  });
  assert.equal(blocked.accepted, false);
  assert.equal(blocked.reason, "destination-not-reachable");
  assert.equal(blocked.state, initial);
  assert.equal(blocked.cost, 0);
});
