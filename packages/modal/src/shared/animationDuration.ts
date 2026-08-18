const DEFAULT_CLOSE_ANIMATION_MS = 200;
const CLOSE_FALLBACK_BUFFER_MS = 50;

function parseDurationToken(token: string): number | null {
  const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(token);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return match[2] === 's' ? value * 1000 : value;
}

export function getCloseAnimationDurationMs(element: HTMLElement | null): number {
  if (!element) {
    return DEFAULT_CLOSE_ANIMATION_MS;
  }

  const longhand = parseDurationToken(element.style.animationDuration);
  if (longhand !== null) {
    return longhand;
  }

  const shorthand = element.style.animation;
  if (shorthand) {
    for (const token of shorthand.split(/\s+/)) {
      const parsed = parseDurationToken(token);
      if (parsed !== null) {
        return parsed;
      }
    }
    return 0;
  }

  return DEFAULT_CLOSE_ANIMATION_MS;
}

export function getCloseFallbackDelayMs(durationMs: number): number {
  return durationMs > 0 ? durationMs + CLOSE_FALLBACK_BUFFER_MS : 0;
}