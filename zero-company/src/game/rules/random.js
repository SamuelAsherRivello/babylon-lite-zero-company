const DEFAULT_SEED = 0x5eed1234;
const STEP = 0x6d2b79f5;

export function normalizeSeed(seed = DEFAULT_SEED) {
  const numericSeed = Number(seed);
  if (!Number.isFinite(numericSeed)) {
    throw new TypeError("A random seed must be a finite number.");
  }
  return Math.trunc(numericSeed) >>> 0;
}
export function createSeededRandom(seed = DEFAULT_SEED) {
  const initialSeed = normalizeSeed(seed);
  return {
    kind: "seeded",
    initialSeed,
    state: initialSeed,
    draws: 0,
  };
}

export function createScriptedRandom(values, { seed = DEFAULT_SEED } = {}) {
  if (!Array.isArray(values)) {
    throw new TypeError("Scripted random values must be an array.");
  }

  const script = values.map((value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue >= 1) {
      throw new RangeError("Scripted random values must be within [0, 1).");
    }
    return numericValue;
  });

  return {
    kind: "scripted",
    values: script,
    index: 0,
    fallback: createSeededRandom(seed),
  };
}

export function cloneRandomSource(source) {
  if (source?.kind === "seeded") {
    return { ...source };
  }
  if (source?.kind === "scripted") {
    return {
      ...source,
      values: [...source.values],
      fallback: cloneRandomSource(source.fallback),
    };
  }
  throw new TypeError("Unknown random source.");
}

export function resetRandomSource(source) {
  if (source?.kind === "seeded") {
    return createSeededRandom(source.initialSeed);
  }
  if (source?.kind === "scripted") {
    return createScriptedRandom(source.values, {
      seed: source.fallback.initialSeed,
    });
  }
  throw new TypeError("Unknown random source.");
}

function nextSeeded(source) {
  const state = (source.state + STEP) >>> 0;
  let value = state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  value = ((value ^ (value >>> 14)) >>> 0) / 4294967296;

  return {
    value,
    source: {
      ...source,
      state,
      draws: source.draws + 1,
    },
  };
}

export function nextRandom(source) {
  if (source?.kind === "seeded") {
    return nextSeeded(source);
  }
  if (source?.kind === "scripted") {
    if (source.index < source.values.length) {
      return {
        value: source.values[source.index],
        source: {
          ...source,
          values: [...source.values],
          index: source.index + 1,
          fallback: cloneRandomSource(source.fallback),
        },
      };
    }

    const fallbackResult = nextSeeded(source.fallback);
    return {
      value: fallbackResult.value,
      source: {
        ...source,
        values: [...source.values],
        fallback: fallbackResult.source,
      },
    };
  }
  throw new TypeError("Unknown random source.");
}
