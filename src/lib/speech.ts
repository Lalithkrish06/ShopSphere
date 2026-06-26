import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

function getSR(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(opts?: { lang?: string; onFinal?: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(opts?.onFinal);
  onFinalRef.current = opts?.onFinal;

  useEffect(() => {
    setSupported(getSR() !== null);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSR();
    if (!Ctor) {
      setError("Speech recognition not supported in this browser. Try Chrome or Edge.");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = opts?.lang ?? (navigator.language || "en-US");
      rec.continuous = false;
      rec.interimResults = true;
      let finalText = "";
      rec.onresult = (e) => {
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          const text = r[0]?.transcript ?? "";
          // crude finality: last entry treated as committed when result list grows
          if (i === e.results.length - 1) interim = text;
          else finalText += text;
        }
        const combined = (finalText + interim).trim();
        setTranscript(combined);
      };
      rec.onerror = (e) => {
        setError(e.error ?? "speech error");
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
        if (onFinalRef.current) {
          // grab the latest transcript value via state setter pattern
          setTranscript((t) => {
            if (t.trim()) onFinalRef.current?.(t.trim());
            return t;
          });
        }
      };
      recRef.current = rec;
      setError(null);
      setTranscript("");
      rec.start();
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "speech failed to start");
    }
  }, [opts?.lang]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, transcript, supported, error, start, stop, setTranscript };
}