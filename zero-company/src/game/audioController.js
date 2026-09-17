export const AUDIO_EFFECTS = Object.freeze({
  step: "step.wav",
  shot: "shot.wav",
  impact: "impact.wav",
  overwatch: "overwatch.wav",
});

export const MUTE_STORAGE_KEY = "babylon-lite-zero-company.muted";

export function createAudioController({
  baseUrl = import.meta.env?.BASE_URL ?? "/",
  createAudio = (url) => new Audio(url),
  storage = globalThis.localStorage,
} = {}) {
  let unlocked = false;
  let muted = storage?.getItem(MUTE_STORAGE_KEY) === "true";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  return {
    get muted() {
      return muted;
    },
    get unlocked() {
      return unlocked;
    },
    unlock() {
      unlocked = true;
    },
    setMuted(value) {
      muted = Boolean(value);
      storage?.setItem(MUTE_STORAGE_KEY, String(muted));
      return muted;
    },
    async play(effect) {
      const filename = AUDIO_EFFECTS[effect];
      if (!filename || muted || !unlocked) {
        return false;
      }

      try {
        const audio = createAudio(`${normalizedBase}assets/audio/${filename}`);
        audio.preload = "auto";
        audio.volume = effect === "shot" ? 0.55 : 0.45;
        await audio.play();
        return true;
      } catch {
        return false;
      }
    },
  };
}
