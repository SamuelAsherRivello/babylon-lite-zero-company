function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
export const WEAPON_DEFINITIONS = deepFreeze({
  short: {
    id: "short",
    label: "Scattergun",
    apCost: 1,
    maxHitProbability: 0.95,
    minDamage: 4,
    maxDamage: 7,
    accuracyFalloff: 0.38,
    damageFalloff: 0.34,
  },
  balanced: {
    id: "balanced",
    label: "Rifle",
    apCost: 1,
    maxHitProbability: 0.88,
    minDamage: 3,
    maxDamage: 5,
    accuracyFalloff: 0.22,
    damageFalloff: 0.2,
  },
  long: {
    id: "long",
    label: "Longarm",
    apCost: 2,
    maxHitProbability: 0.8,
    minDamage: 5,
    maxDamage: 8,
    accuracyFalloff: 0.12,
    damageFalloff: 0.1,
  },
});

export function getWeaponDefinition(weaponId) {
  return WEAPON_DEFINITIONS[weaponId] ?? null;
}

function falloffValue(maximum, falloff, distance) {
  const beyondAdjacent = Math.max(distance - 1, 0);
  return maximum / (1 + falloff * beyondAdjacent);
}

export function getWeaponValuesAtDistance(weaponId, distance) {
  const weapon = getWeaponDefinition(weaponId);
  if (!weapon) {
    throw new RangeError(`Unknown weapon: ${weaponId}`);
  }
  if (!Number.isFinite(distance) || distance < 0) {
    throw new RangeError("Attack distance must be a non-negative number.");
  }

  const effectiveDistance = Math.max(distance, 1);
  const hitProbability = Number(
    falloffValue(
      weapon.maxHitProbability,
      weapon.accuracyFalloff,
      effectiveDistance,
    ).toFixed(6),
  );
  const maxDamage = Math.max(
    1,
    Math.floor(
      falloffValue(weapon.maxDamage, weapon.damageFalloff, effectiveDistance),
    ),
  );
  const minDamage = Math.min(
    maxDamage,
    Math.max(
      1,
      Math.floor(
        falloffValue(weapon.minDamage, weapon.damageFalloff, effectiveDistance),
      ),
    ),
  );

  return { hitProbability, minDamage, maxDamage };
}
