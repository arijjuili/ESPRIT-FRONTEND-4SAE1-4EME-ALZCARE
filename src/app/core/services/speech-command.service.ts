import { Injectable } from '@angular/core';

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  onresult: ((event: any) => void) | null;
  onstart: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export interface SpeechDebugEvent {
  at: string;
  type: 'init' | 'start' | 'speechstart' | 'result' | 'emit' | 'error' | 'end' | 'restart' | 'stop';
  message: string;
}

export interface SpeechStartOptions {
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  lang?: string;
}

@Injectable({ providedIn: 'root' })
export class SpeechCommandService {
  private recognition: any = null;
  private listening = false;
  private keepListening = false;
  private lastCommand = '';
  private lastCommandAt = 0;

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }

  isListening(): boolean {
    return this.listening;
  }

  startListening(
    onCommand: (command: string) => void,
    onError?: (message: string) => void,
    onDebug?: (event: SpeechDebugEvent) => void,
    options?: SpeechStartOptions
  ): boolean {
    if (!this.isSupported()) {
      onError?.('Speech recognition is not supported in this browser.');
      this.debug(onDebug, 'error', 'Speech recognition not supported.');
      return false;
    }

    this.stopListening();

    const SpeechRecognition = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as SpeechRecognitionCtor;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = options?.continuous ?? true;
    this.recognition.interimResults = options?.interimResults ?? true;
    this.recognition.maxAlternatives = options?.maxAlternatives ?? 5;
    this.recognition.lang = options?.lang || navigator.language || 'en-US';
    this.keepListening = true;
    this.debug(onDebug, 'init', `Initialized recognition (lang=${this.recognition.lang}, alternatives=${this.recognition.maxAlternatives}).`);

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternatives: string[] = [];
        for (let j = 0; j < result.length; j++) {
          const transcript = String(result[j]?.transcript || '').trim().toLowerCase();
          if (transcript) alternatives.push(transcript);
        }
        this.debug(onDebug, 'result', `Result ${i}: ${alternatives.join(' | ') || '(empty)'}`);
        // Emit all alternatives; de-duper prevents noise.
        alternatives.forEach(phrase => this.emitCommand(phrase, onCommand, onDebug));
      }
    };

    this.recognition.onstart = () => {
      this.listening = true;
      this.debug(onDebug, 'start', 'Recognition started.');
    };

    if ('onspeechstart' in this.recognition) {
      this.recognition.onspeechstart = () => {
        this.debug(onDebug, 'speechstart', 'Speech detected.');
      };
    }

    this.recognition.onerror = (event: any) => {
      // Keep UX clean: avoid noisy transient messages for normal speech errors.
      if (!this.keepListening) return;
      const code = String(event?.error || '');
      if (code === 'no-speech' || code === 'aborted' || code === 'network') {
        this.debug(onDebug, 'error', `Transient speech error: ${code}`);
        return;
      }
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        this.keepListening = false;
        this.listening = false;
        this.debug(onDebug, 'error', `Permission error: ${code}`);
        onError?.('Voice permission is blocked. Please allow microphone access.');
      }
    };

    this.recognition.onend = () => {
      this.debug(onDebug, 'end', 'Recognition ended.');
      if (this.keepListening) {
        this.restart(onError, onDebug);
        return;
      }
      this.listening = false;
    };

    try {
      this.recognition.start();
      this.listening = true;
      this.debug(onDebug, 'start', 'Recognition start() called.');
      return true;
    } catch {
      this.listening = false;
      this.debug(onDebug, 'error', 'Recognition start() failed.');
      onError?.('Unable to start voice commands.');
      return false;
    }
  }

  stopListening(): void {
    this.keepListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // no-op
      }
    }
    this.listening = false;
    this.recognition = null;
  }

  private restart(onError?: (message: string) => void, onDebug?: (event: SpeechDebugEvent) => void): void {
    if (!this.recognition || !this.keepListening) return;
    window.setTimeout(() => {
      if (!this.recognition || !this.keepListening) return;
      try {
        this.recognition.start();
        this.listening = true;
        this.debug(onDebug, 'restart', 'Recognition restarted.');
      } catch {
        // Silently retry once more; do not spam the UI.
        window.setTimeout(() => {
          if (!this.recognition || !this.keepListening) return;
          try {
            this.recognition.start();
            this.listening = true;
            this.debug(onDebug, 'restart', 'Recognition restarted on retry.');
          } catch {
            this.listening = false;
            this.debug(onDebug, 'error', 'Recognition restart failed.');
            onError?.('Voice commands are temporarily unavailable.');
          }
        }, 180);
      }
    }, 40);
  }

  private emitCommand(transcript: string, onCommand: (command: string) => void, onDebug?: (event: SpeechDebugEvent) => void): void {
    const now = Date.now();
    const normalized = transcript.trim();
    if (!normalized) return;
    // De-duplicate repeated interim/final transcripts.
    if (normalized === this.lastCommand && now - this.lastCommandAt < 650) {
      this.debug(onDebug, 'emit', `Skipped duplicate: "${normalized}"`);
      return;
    }
    this.lastCommand = normalized;
    this.lastCommandAt = now;
    this.debug(onDebug, 'emit', `Emitting phrase: "${normalized}"`);
    onCommand(normalized);
  }

  private debug(onDebug: ((event: SpeechDebugEvent) => void) | undefined, type: SpeechDebugEvent['type'], message: string): void {
    if (!onDebug) return;
    onDebug({ at: new Date().toISOString(), type, message });
  }
}
