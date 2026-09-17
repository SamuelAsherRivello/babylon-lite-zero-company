import { LEVEL_DEFINITION, isCellInBounds } from "./level.js";
import { hasLineOfSight } from "./lineOfSight.js";
import { cloneRandomSource, nextRandom } from "./random.js";
import {
  getWeaponDefinition,
  getWeaponValuesAtDistance,
} from "./weapons.js";

export function getCellDistance(firstCell, secondCell, level = LEVEL_DEFINITION) {
  const columnDistance = (secondCell.column - firstCell.column) * level.cellSize;
  const rowDistance = (secondCell.row - firstCell.row) * level.cellSize;
  return Math.hypot(columnDistance, rowDistance);
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

  return {
    weaponId,
    apCost: weapon.apCost,
    distance,
    blocked: !lineOfSight,
    hasLineOfSight: lineOfSight,
    selectable,
    hitProbability: selectable ? values.hitProbability : 0,
    minDamage: selectable ? values.minDamage : 0,
    maxDamage: selectable ? values.maxDamage : 0,
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
