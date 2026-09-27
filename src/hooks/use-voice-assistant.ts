"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { VoiceLanguage, VoicePlaybackState } from "@/types/voice";

// Web Speech API interface declarations for TypeScript compatibility
interface SpeechRecognitionEventLike extends Event {
  results: {
    length: number;
    item(index: number): {
      length: number;
      item(index: number): { transcript: string };
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
    [index: number]: {
      length: number;
      item(index: number): { transcript: string };
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
  };
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognitionLike;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognitionLike;
    };
  }
}

export interface UseVoiceAssistantOptions {
  language?: VoiceLanguage;
  onFinalTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export interface UseVoiceAssistantReturn {
  // Speech-to-Text State
  isListening: boolean;
  isSupported: boolean;
  isTtsSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: (lang?: VoiceLanguage) => void;
  stopListening: () => void;
  resetTranscript: () => void;

  // Text-to-Speech State
  playbackState: VoicePlaybackState;
  isPlaying: boolean;
  isPaused: boolean;
  speak: (text: string, lang?: VoiceLanguage) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

import { globalVoiceService } from "@/services/voice/voice-service";

/**
 * Intelligent voice selector prioritizing human-sounding Neural and Natural voices.
 */
function selectBestVoice(
  availableVoices: SpeechSynthesisVoice[],
  targetLocale: string
): SpeechSynthesisVoice | null {
  if (!availableVoices || availableVoices.length === 0) return null;

  const langCode = targetLocale.split("-")[0]?.toLowerCase() || "en";
  const fullTarget = targetLocale.toLowerCase().replace("_", "-");

  // Filter voices matching the requested language or region
  const matchingVoices = availableVoices.filter((v) => {
    const vLang = v.lang.toLowerCase().replace("_", "-");
    return vLang === fullTarget || vLang.startsWith(langCode);
  });

  const pool = matchingVoices.length > 0 ? matchingVoices : availableVoices;

  // 1. Prioritize ultra-realistic Natural / Neural / Online voices (Edge & Chrome)
  const naturalVoice = pool.find((v) =>
    /natural|neural|online|multilingual/i.test(v.name)
  );
  if (naturalVoice) return naturalVoice;

  // 2. High-quality cloud / platform voices (Google, Siri, Lekha)
  const highQualityVoice = pool.find((v) =>
    /google|siri|premium|enhanced|lekha|swara|madhur/i.test(v.name)
  );
  if (highQualityVoice) return highQualityVoice;

  // 3. Fallback to any voice in matching language
  if (matchingVoices.length > 0) {
    return matchingVoices[0]!;
  }

  // 4. Default system voice
  return availableVoices.find((v) => v.default) || availableVoices[0] || null;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}): UseVoiceAssistantReturn {
  const { language = "en-US", onFinalTranscript, onError } = options;

  // STT State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isTtsSupported, setIsTtsSupported] = useState(false);

  // Available Voices State
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // TTS State
  const [playbackState, setPlaybackState] = useState<VoicePlaybackState>("idle");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load and cache high-quality speech synthesis voices
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      const hasSynthesis = typeof window.speechSynthesis !== "undefined";
      setIsSupported(hasRecognition);
      setIsTtsSupported(hasSynthesis);

      if (hasSynthesis) {
        const updateVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            setAvailableVoices(voices);
          }
        };

        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;

        return () => {
          if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = null;
          }
        };
      }
    }
  }, []);

  const clearKeepAlive = () => {
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
  };

  // Stop listening helper
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition might already be stopped
      }
    }
    setIsListening(false);
  }, []);

  // Start listening handler
  const startListening = useCallback(
    (lang?: VoiceLanguage) => {
      setError(null);
      setInterimTranscript("");

      if (typeof window === "undefined") return;

      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        const msg = "Speech recognition is not supported in this browser.";
        setError(msg);
        onError?.(msg);
        return;
      }

      // Stop any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = lang || language;

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let currentInterim = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result) {
              if (result.isFinal) {
                finalTranscript += result[0]?.transcript || "";
              } else {
                currentInterim += result[0]?.transcript || "";
              }
            }
          }

          if (currentInterim) {
            setInterimTranscript(currentInterim);
          }

          if (finalTranscript) {
            const trimmed = finalTranscript.trim();
            setTranscript(trimmed);
            setInterimTranscript("");
            onFinalTranscript?.(trimmed);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
          // 'no-speech' is a normal timeout, not a critical error
          if (event.error !== "no-speech") {
            const errMsg = `Speech recognition error: ${event.error}`;
            setError(errMsg);
            onError?.(errMsg);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start speech recognition";
        setError(msg);
        onError?.(msg);
        setIsListening(false);
      }
    },
    [language, onFinalTranscript, onError]
  );

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  // Cancel playback helper
  const cancel = useCallback(() => {
    clearKeepAlive();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlaybackState("idle");
    activeUtteranceRef.current = null;
  }, []);

  // Speak handler with natural voice selection & clean pronunciation
  const speak = useCallback(
    (text: string, lang?: VoiceLanguage) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        return;
      }

      // Stop any active playback
      clearKeepAlive();
      window.speechSynthesis.cancel();

      const targetLocale = lang || language;
      // Pre-clean speech text (strips markdown, code blocks, emojis, expands meteorological units)
      const cleaned = globalVoiceService.cleanForSpeech(text, targetLocale);

      if (!cleaned.trim()) {
        setPlaybackState("idle");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = targetLocale;

      // Select human-sounding natural/neural voice
      const currentVoices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
      const bestVoice = selectBestVoice(currentVoices, targetLocale);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      // Natural speech cadence & pitch
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setPlaybackState("speaking");
        // Chrome keep-alive to avoid speech cutting off on longer answers (>15s)
        clearKeepAlive();
        keepAliveTimerRef.current = setInterval(() => {
          if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      };

      utterance.onpause = () => {
        setPlaybackState("paused");
      };

      utterance.onresume = () => {
        setPlaybackState("speaking");
      };

      utterance.onend = () => {
        clearKeepAlive();
        setPlaybackState("idle");
        activeUtteranceRef.current = null;
      };

      utterance.onerror = () => {
        clearKeepAlive();
        setPlaybackState("idle");
        activeUtteranceRef.current = null;
      };

      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [availableVoices, language]
  );

  const pause = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis && playbackState === "speaking") {
      window.speechSynthesis.pause();
      setPlaybackState("paused");
    }
  }, [playbackState]);

  const resume = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis && playbackState === "paused") {
      window.speechSynthesis.resume();
      setPlaybackState("speaking");
    }
  }, [playbackState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    isTtsSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    playbackState,
    isPlaying: playbackState === "speaking",
    isPaused: playbackState === "paused",
    speak,
    pause,
    resume,
    cancel,
  };
}
