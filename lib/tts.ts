import * as Speech from "expo-speech";
import { Platform } from "react-native";

let isSpeaking = false;

export async function speak(text: string): Promise<void> {
  if (isSpeaking) {
    Speech.stop();
    isSpeaking = false;
    return;
  }

  // Strip markdown formatting for cleaner speech
  const clean = text
    .replace(/[#*_~`>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ");

  if (Platform.OS === "web") {
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      isSpeaking = false;
    };
    window.speechSynthesis.speak(utterance);
    isSpeaking = true;
  } else {
    isSpeaking = true;
    Speech.speak(clean, {
      rate: 0.9,
      pitch: 1.0,
      onDone: () => {
        isSpeaking = false;
      },
      onStopped: () => {
        isSpeaking = false;
      },
    });
  }
}

export function stopSpeaking(): void {
  if (Platform.OS === "web") {
    window.speechSynthesis.cancel();
  } else {
    Speech.stop();
  }
  isSpeaking = false;
}

export function getIsSpeaking(): boolean {
  return isSpeaking;
}
