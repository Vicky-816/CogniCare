"use client";

import type { Language } from "@/lib/profiles/types";

/** BCP 47 tags for the tablet's built-in voice. */
const VOICE_LANG: Record<Language, string> = { en: "en-IN", hi: "hi-IN" };

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/**
 * Reads the text aloud with the device's built-in voice, slowly and clearly.
 * Resolves true when speech finished, false if it could not play (no voice, or the browser blocked sound).
 */
export function speak(text: string, language: Language = "en"): Promise<boolean> {
  if (!canSpeak() || !text.trim()) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = VOICE_LANG[language];
      const voice = synth.getVoices().find((item) => item.lang.toLowerCase().startsWith(language));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.85;
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      synth.speak(utterance);
    } catch {
      resolve(false);
    }
  });
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
