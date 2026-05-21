/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// Mock react-native Platform in require.cache
const reactNativePath = require.resolve("react-native");
let mockPlatformOS = "web";
require.cache[reactNativePath] = {
  id: reactNativePath,
  filename: reactNativePath,
  loaded: true,
  exports: {
    Platform: {
      get OS() {
        return mockPlatformOS;
      },
    },
  },
} as any;

// Mock expo-speech
const mockExpoSpeak = mock.fn();
const mockExpoStop = mock.fn();
const expoSpeechPath = require.resolve("expo-speech");
require.cache[expoSpeechPath] = {
  id: expoSpeechPath,
  filename: expoSpeechPath,
  loaded: true,
  exports: {
    speak: mockExpoSpeak,
    stop: mockExpoStop,
  },
} as any;

// Mock web speech synthesis
const mockWebSpeak = mock.fn();
const mockWebCancel = mock.fn();
(global as any).window = {};
(global as any).SpeechSynthesisUtterance = class {
  text: string;
  rate: number = 1.0;
  pitch: number = 1.0;
  onend: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
};
(global as any).window.speechSynthesis = {
  speak: mockWebSpeak,
  cancel: mockWebCancel,
};

const { speak, stopSpeaking, getIsSpeaking } = require("../lib/tts");

describe("Text to Speech (TTS) Module", () => {
  test("Markdown stripping utility regex checks", async () => {
    mockPlatformOS = "web";
    mockWebSpeak.mock.resetCalls();

    const sampleMarkdown =
      "# Heading\n**Bold Text** and *Italic* with a [Link Description](https://link.com).\n\nParagraph 2.";
    // Let's call speak with Markdown content
    const speakPromise = speak(sampleMarkdown);

    assert.equal(mockWebSpeak.mock.callCount(), 1, "Should call window.speechSynthesis.speak");
    const utterance = mockWebSpeak.mock.calls[0].arguments[0];

    assert.ok(
      utterance instanceof (global as any).SpeechSynthesisUtterance,
      "Should pass an instance of SpeechSynthesisUtterance",
    );
    // Assert markdown cleanup:
    // "# Heading" -> " Heading" or similar, bold ** removed, italic * removed, link format replaced by text inside brackets
    const cleanedText = utterance.text;
    assert.ok(!cleanedText.includes("#"), "Markdown headers must be stripped");
    assert.ok(!cleanedText.includes("**"), "Bold syntax must be stripped");
    assert.ok(!cleanedText.includes("*"), "Italic syntax must be stripped");
    assert.ok(!cleanedText.includes("https://"), "Link destination URL must be stripped");
    assert.ok(cleanedText.includes("Link Description"), "Link description text must be preserved");

    // Complete the speech cycle by triggering onend callback
    assert.equal(getIsSpeaking(), true, "Should set isSpeaking state to true");
    if (utterance.onend) {
      utterance.onend();
    }
    assert.equal(getIsSpeaking(), false, "isSpeaking should reset to false on speech end");

    await speakPromise;
  });

  test("Browser cancel/stop operations", () => {
    mockPlatformOS = "web";
    mockWebCancel.mock.resetCalls();

    stopSpeaking();
    assert.equal(
      mockWebCancel.mock.callCount(),
      1,
      "Should invoke window.speechSynthesis.cancel() on web",
    );
    assert.equal(getIsSpeaking(), false, "isSpeaking state must toggle to false");
  });

  test("Native platform Expo triggers", async () => {
    mockPlatformOS = "ios";
    mockExpoSpeak.mock.resetCalls();

    await speak("Simple verse speak");
    assert.equal(
      mockExpoSpeak.mock.callCount(),
      1,
      "Should call native expo-speech speak function",
    );
    assert.equal(
      mockExpoSpeak.mock.calls[0].arguments[0],
      "Simple verse speak",
      "Should speak plain clean text",
    );
    assert.equal(getIsSpeaking(), true, "isSpeaking state must be true");

    // Call stop
    mockExpoStop.mock.resetCalls();
    stopSpeaking();
    assert.equal(mockExpoStop.mock.callCount(), 1, "Should call native expo-speech stop function");
    assert.equal(getIsSpeaking(), false, "isSpeaking state must reset to false");
  });
});
