// Deepgram WebSocket client for real-time transcription with speaker diarization
// Uses Nova-2 model for best accuracy

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  speaker: number;
  confidence: number;
  isFinal: boolean;
}

export interface DeepgramClientOptions {
  onTranscript: (segment: TranscriptSegment) => void;
  onUtteranceEnd: () => void; // Called when speaker finishes a thought
  onError: (error: Error) => void;
  onConnectionChange: (connected: boolean) => void;
}

export class DeepgramClient {
  private ws: WebSocket | null = null;
  private options: DeepgramClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private isIntentionallyClosed = false;

  constructor(options: DeepgramClientOptions) {
    this.options = options;
  }

  async connect(apiKey: string): Promise<void> {
    this.isIntentionallyClosed = false;
    this.reconnectAttempts = 0;

    return this.establishConnection(apiKey);
  }

  private async establishConnection(apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build Deepgram WebSocket URL with parameters
      const params = new URLSearchParams({
        model: "nova-2",
        diarize: "true",
        smart_format: "true",
        punctuate: "true",
        interim_results: "true",
        utterance_end_ms: "1000",
        vad_events: "true",
        encoding: "linear16",
        sample_rate: "16000",
        channels: "1",
      });

      const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

      this.ws = new WebSocket(url, ["token", apiKey]);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.options.onConnectionChange(true);
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle transcript results
          if (data.type === "Results" && data.channel?.alternatives?.[0]) {
            const alt = data.channel.alternatives[0];
            const words = alt.words || [];

            if (alt.transcript && alt.transcript.trim()) {
              // Get speaker from first word (Deepgram assigns speaker per word)
              const speaker = words.length > 0 ? (words[0].speaker ?? 0) : 0;

              const segment: TranscriptSegment = {
                text: alt.transcript,
                start: words.length > 0 ? words[0].start : 0,
                end: words.length > 0 ? words[words.length - 1].end : 0,
                speaker,
                confidence: alt.confidence || 0,
                isFinal: data.is_final === true,
              };

              this.options.onTranscript(segment);
            }
          }

          // Handle speech started event (for UI feedback)
          if (data.type === "SpeechStarted") {
            // Could emit an event here for UI indication
          }

          // Handle utterance end (natural pause in speech)
          if (data.type === "UtteranceEnd") {
            this.options.onUtteranceEnd();
          }
        } catch {
          // Ignore parse errors for non-JSON messages
        }
      };

      this.ws.onerror = (event) => {
        const error = new Error("Deepgram WebSocket error");
        this.options.onError(error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        this.options.onConnectionChange(false);

        // Attempt reconnection if not intentionally closed
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Deepgram reconnection attempt ${this.reconnectAttempts}...`);
          setTimeout(() => {
            this.establishConnection(apiKey).catch(() => {
              // Reconnection failed
            });
          }, 1000 * this.reconnectAttempts);
        }
      };
    });
  }

  sendAudio(data: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  // Send keep-alive to prevent timeout
  sendKeepAlive(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "KeepAlive" }));
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      // Send close stream message to Deepgram
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "CloseStream" }));
      }
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
