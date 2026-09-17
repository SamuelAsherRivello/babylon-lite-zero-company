import { LEVEL_DEFINITION, isCellInBounds } from "./level.js";
import { hasLineOfSight } from "./lineOfSight.js";
import { cloneRandomSource, nextRandom } from "./random.js";
import {
  getWeaponDefinition,
  getWeaponValuesAtDistance,
} from "./weapons.js";

export const COVER_DEFENSE = Object.freeze({
  id: "cover-defense",
  reduction: 0.2,
  minimumHitProbability: 0.05,
});

export function getCellDistance(firstCell, secondCell, level = LEVEL_DEFINITION) {
  const columnDistance = (secondCell.column - firstCell.column) * level.cellSize;
  const rowDistance = (secondCell.row - firstCell.row) * level.cellSize;
  return Math.hypot(columnDistance, rowDistance);
}

function cloneCell(cell) {
  return { column: cell.column, row: cell.row };
}

function sign(value) {
  return value === 0 ? 0 : value > 0 ? 1 : -1;
}

function adjacentCoverCells(targetCell, level) {
  return level.covers.flatMap((cover) =>
    cover.cells
      .filter((cell) => {
        const columnDelta = Math.abs(cell.column - targetCell.column);
        const rowDelta = Math.abs(cell.row - targetCell.row);
        return (
          (columnDelta > 0 || rowDelta > 0) &&
          columnDelta <= 1 &&
          rowDelta <= 1
        );
      })
      .map(cloneCell),
  );
}

function coverFacesShooter(coverCell, shooterCell, targetCell) {
  const coverVector = {
    column: sign(coverCell.column - targetCell.column),
    row: sign(coverCell.row - targetCell.row),
  };
  const shooterVector = {
    column: sign(shooterCell.column - targetCell.column),
    row: sign(shooterCell.row - targetCell.row),
  };
  return (
    coverVector.column * shooterVector.column +
    coverVector.row * shooterVector.row
  ) > 0;
}

export function getCoverDefense({
  level = LEVEL_DEFINITION,
  shooterCell,
  targetCell,
}) {
  if (!isCellInBounds(shooterCell, level) || !isCellInBounds(targetCell, level)) {
    throw new RangeError("Cover defense cells must be inside the level grid.");
  }

  const adjacentCells = adjacentCoverCells(targetCell, level);
  const defendingCells = adjacentCells.filter((coverCell) =>
    coverFacesShooter(coverCell, shooterCell, targetCell),
  );

  return {
    active: defendingCells.length > 0,
    reduction: COVER_DEFENSE.reduction,
    minimumHitProbability: COVER_DEFENSE.minimumHitProbability,
    adjacentCells,
    defendingCells,
  };
}

function applyTerrainModifiers(baseHitProbability, coverDefense) {
  if (!coverDefense.active) {
    return {
      hitProbability: baseHitProbability,
      terrainModifiers: [],
    };
  }

  const hitProbability = Number(
    Math.max(
      COVER_DEFENSE.minimumHitProbability,
      baseHitProbability - COVER_DEFENSE.reduction,
    ).toFixed(6),
  );

  return {
    hitProbability,
    terrainModifiers: [
      {
        id: COVER_DEFENSE.id,
        label: "Cover",
        reduction: COVER_DEFENSE.reduction,
        fromHitProbability: baseHitProbability,
        toHitProbability: hitProbability,
      },
    ],
  };
}

export function queryAttack({
  level = LEVEL_DEFINITION,
  weaponId,
  shooterCell,
  targetCell,
  units = [],
}) {
  const weapon = getWeaponDefinition(weaponId);
  if (!weapon) {
    throw new RangeError(`Unknown weapon: ${weaponId}`);
  }
  if (!isCellInBounds(shooterCell, level) || !isCellInBounds(targetCell, level)) {
    throw new RangeError("Attack cells must be inside the level grid.");
  }

  const distance = getCellDistance(shooterCell, targetCell, level);
  const lineOfSight = hasLineOfSight({
    level,
    fromCell: shooterCell,
    targetCell,
    units,
  });
  const values = getWeaponValuesAtDistance(weaponId, distance);
  const selectable = distance > 0 && lineOfSight && values.hitProbability > 0;
  const baseHitProbability = selectable ? values.hitProbability : 0;
  const coverDefense = selectable
    ? getCoverDefense({ level, shooterCell, targetCell })
    : {
        active: false,
        reduction: COVER_DEFENSE.reduction,
        minimumHitProbability: COVER_DEFENSE.minimumHitProbability,
        adjacentCells: [],
        defendingCells: [],
      };
  const terrain = applyTerrainModifiers(baseHitProbability, coverDefense);

  return {
    weaponId,
    apCost: weapon.apCost,
    distance,
    blocked: !lineOfSight,
    hasLineOfSight: lineOfSight,
    selectable,
    baseHitProbability,
    hitProbability: selectable ? terrain.hitProbability : 0,
    minDamage: selectable ? values.minDamage : 0,
    maxDamage: selectable ? values.maxDamage : 0,
    coverDefense,
    terrainModifiers: selectable ? terrain.terrainModifiers : [],
  };
}

function damageFromRoll(preview, roll) {
  const possibleValues = preview.maxDamage - preview.minDamage + 1;
  return Math.min(
    preview.maxDamage,
    preview.minDamage + Math.floor(roll * possibleValues),
  );
}

export function resolveAttack({ randomSource, ...attack }) {
  const preview = queryAttack(attack);
  if (!randomSource) {
    throw new TypeError("resolveAttack requires a random source.");
  }
  if (!preview.selectable) {
    return {
      preview,
      hit: false,
      damage: 0,
      hitRoll: null,
      damageRoll: null,
      randomSource: cloneRandomSource(randomSource),
    };
  }

  const hitResult = nextRandom(randomSource);
  const hit = hitResult.value < preview.hitProbability;
  if (!hit) {
    return {
      preview,
      hit: false,
      damage: 0,
      hitRoll: hitResult.value,
      damageRoll: null,
      randomSource: hitResult.source,
    };
  }

  const damageResult = nextRandom(hitResult.source);
  return {
    preview,
    hit: true,
    damage: damageFromRoll(preview, damageResult.value),
    hitRoll: hitResult.value,
    damageRoll: damageResult.value,
    randomSource: damageResult.source,
  };
}
