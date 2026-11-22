"use client";

let context: AudioContext | null = null;

/**
 * Plays a soft two-note chime (no sound files needed). Resolves true if sound could play.
 * Browsers only allow sound after the person has tapped the page at least once; if not,
 * this resolves false and the card offers a "Tap to hear" button instead.
 */
export async function playChime(): Promise<boolean> {
  try {
    const AudioContextClass =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return false;
    context ??= new AudioContextClass();
    if (context.state === "suspended") await Promise.race([context.resume(), wait(300)]);
    if (context.state !== "running") return false;

    const start = context.currentTime + 0.05;
    // A gentle major third (E5 then C5), each fading out slowly.
    for (const [index, frequency] of [659.25, 523.25].entries()) {
      const at = start + index * 0.45;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 1.5);
    }
    await wait(1100);
    return true;
  } catch {
    return false;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
