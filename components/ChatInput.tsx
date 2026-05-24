import { useState, useRef } from "react";
import { View, TextInput, Pressable, Text, Platform, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAudioRecorder, RecordingPresets, AudioModule } from "expo-audio";
import { ArrowUp, Mic, MicOff } from "lucide-react-native";
import { colors, fonts } from "../lib/theme";

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY || "";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Web: use browser Web Speech API
  const toggleVoiceWeb = () => {
    const globalWindow = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRecognition =
      globalWindow.SpeechRecognition || globalWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setText((prev) => prev + (prev ? " " : "") + transcript);
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  };

  // Native: record with expo-audio, transcribe with OpenAI Whisper
  const toggleVoiceNative = async () => {
    if (isListening) {
      audioRecorder.stop();
      setIsListening(false);

      const uri = audioRecorder.uri;
      if (!uri) return;

      try {
        const formData = new FormData();
        formData.append("file", { uri, name: "audio.m4a", type: "audio/m4a" } as unknown as Blob);
        formData.append("model", "whisper-1");

        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_KEY}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.text) {
            setText((prev) => prev + (prev ? " " : "") + data.text);
          }
        }
      } catch {
        // Silently ignore transcription errors
      }
      return;
    }

    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) return;

    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setIsListening(true);
  };

  const toggleVoiceInput = () => {
    if (Platform.OS === "web") {
      toggleVoiceWeb();
    } else {
      toggleVoiceNative();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSend(trimmed);
    setText("");
  };

  const canSend = text.trim().length > 0 && !disabled;

  const sendScale = useSharedValue(1);
  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          disabled && styles.containerDisabled,
          isFocused && styles.containerFocused,
        ]}
      >
        <View style={styles.inputCol}>
          <TextInput
            style={styles.input}
            placeholder="Ask Aion anything..."
            placeholderTextColor={colors.textGhost}
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            editable={!disabled}
            maxLength={500}
            accessibilityLabel="Message input"
          />
          {text.length > 0 && (
            <Text
              style={[
                styles.charCount,
                text.length > 450 && styles.charCountWarn,
                text.length > 500 && styles.charCountError,
              ]}
            >
              {text.length}/500
            </Text>
          )}
        </View>
        <Pressable
          onPress={toggleVoiceInput}
          style={[styles.micButton, isListening && styles.micButtonActive]}
          accessibilityLabel={isListening ? "Stop listening" : "Voice input"}
          accessibilityRole="button"
        >
          {isListening ? (
            <MicOff size={16} color="#DC2626" />
          ) : (
            <Mic size={16} color={colors.textGhost} />
          )}
        </Pressable>
        <Animated.View
          style={[
            styles.sendButton,
            canSend ? styles.sendActive : styles.sendInactive,
            sendAnimStyle,
          ]}
        >
          <Pressable
            onPress={handleSend}
            onPressIn={() => {
              sendScale.value = withSpring(0.85);
            }}
            onPressOut={() => {
              sendScale.value = withSpring(1);
            }}
            disabled={!canSend}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.sendButtonInner,
              hovered && canSend && styles.sendButtonInnerHovered,
            ]}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <ArrowUp size={16} color={canSend ? colors.white : colors.textGhost} strokeWidth={3} />
          </Pressable>
        </Animated.View>
      </View>
      <Text style={styles.poweredBy}>Powered by Aion AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
    backgroundColor: "rgba(10, 10, 12, 0.85)", // Semi-transparent dark obsidian dock
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(17, 17, 20, 0.5)", // Higher contrast input surface
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.ui,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  sendButtonInnerHovered: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  sendActive: {
    backgroundColor: colors.purple,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  sendInactive: {
    backgroundColor: colors.steel,
  },
  containerDisabled: {
    borderColor: colors.purpleBorder,
    backgroundColor: "rgba(138, 43, 226, 0.03)",
  },
  containerFocused: {
    borderColor: "rgba(138, 43, 226, 0.35)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  inputCol: {
    flex: 1,
  },
  charCount: {
    color: colors.textGhost,
    fontSize: 9,
    textAlign: "right",
    paddingRight: 14,
    paddingBottom: 2,
  },
  charCountWarn: {
    color: colors.purpleGlow,
  },
  charCountError: {
    color: colors.error,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 6,
  },
  micButtonActive: {
    backgroundColor: "rgba(220, 38, 38, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.3)",
  },
  poweredBy: {
    color: "rgba(255,255,255,0.12)",
    fontSize: 9,
    textAlign: "center",
    marginTop: 6,
    letterSpacing: 1,
  },
});
