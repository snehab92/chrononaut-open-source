// Audio capture utility for transcription
// Supports dual-stream capture: microphone + system audio via BlackHole

export type AudioCaptureState = "idle" | "capturing" | "paused" | "stopped";

export interface AudioCaptureOptions {
  onAudioData: (data: ArrayBuffer) => void;
  onError: (error: Error) => void;
  onStateChange: (state: AudioCaptureState) => void;
}

export type AudioDeviceType = "aggregate" | "blackhole" | "microphone";

export interface AudioDevice {
  deviceId: string;
  label: string;
  type: AudioDeviceType;
  isBlackHole: boolean;
  capturesMicrophone: boolean;
  capturesSystemAudio: boolean;
}

export interface DualAudioDevices {
  microphone: AudioDevice | null;
  systemAudio: AudioDevice | null;
}

// Helper to check if a device is BlackHole
function isBlackHoleDevice(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("blackhole") || lower.includes("black hole");
}

// Helper to check if a device is an aggregate device
function isAggregateDevice(label: string): boolean {
  return label.toLowerCase().includes("aggregate");
}

// Check if we already have microphone permission (without prompting)
async function hasMicrophonePermission(): Promise<boolean> {
  try {
    // Use the Permissions API if available
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      return result.state === "granted";
    }
    // Fallback: check if we can enumerate devices with labels
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");
    // If we have labels, permission was already granted
    return audioInputs.some((d) => d.label && d.label.length > 0);
  } catch {
    return false;
  }
}

// Detect both microphone and BlackHole devices
// This version does NOT prompt for permission or activate the microphone
// Call requestMicrophonePermission() first if you need full device labels
export async function detectAudioDevices(): Promise<DualAudioDevices> {
  try {
    // Just enumerate devices without opening a stream
    // Device labels will only be available if permission was previously granted
    // We don't need to open a stream just to detect devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");

    console.log("Available audio inputs:", audioInputs.map((d) => d.label));

    // Find BlackHole device for system audio
    let systemAudio: AudioDevice | null = null;

    // Check for aggregate device with BlackHole first (highest priority)
    const aggregateWithBlackHole = audioInputs.find(
      (d) => isAggregateDevice(d.label) && isBlackHoleDevice(d.label)
    );

    if (aggregateWithBlackHole) {
      // If user has an aggregate device, use it exclusively (it has both mic + system)
      console.log("Found aggregate device with BlackHole:", aggregateWithBlackHole.label);
      return {
        microphone: null, // Aggregate includes mic
        systemAudio: {
          deviceId: aggregateWithBlackHole.deviceId,
          label: aggregateWithBlackHole.label,
          type: "aggregate",
          isBlackHole: true,
          capturesMicrophone: true,
          capturesSystemAudio: true,
        },
      };
    }

    // Find plain BlackHole device
    const blackHole = audioInputs.find((d) => isBlackHoleDevice(d.label));
    if (blackHole) {
      systemAudio = {
        deviceId: blackHole.deviceId,
        label: blackHole.label,
        type: "blackhole",
        isBlackHole: true,
        capturesMicrophone: false,
        capturesSystemAudio: true,
      };
    }

    // Find default microphone (first non-BlackHole device, or device marked as default)
    let microphone: AudioDevice | null = null;

    // Try to find the default device first
    const defaultDevice = audioInputs.find((d) => d.deviceId === "default");
    if (defaultDevice && !isBlackHoleDevice(defaultDevice.label)) {
      microphone = {
        deviceId: defaultDevice.deviceId,
        label: defaultDevice.label || "Default Microphone",
        type: "microphone",
        isBlackHole: false,
        capturesMicrophone: true,
        capturesSystemAudio: false,
      };
    }

    // If no default, find first non-BlackHole microphone
    if (!microphone) {
      const regularMic = audioInputs.find(
        (d) => !isBlackHoleDevice(d.label) && d.deviceId !== "default"
      );
      if (regularMic) {
        microphone = {
          deviceId: regularMic.deviceId,
          label: regularMic.label || "Microphone",
          type: "microphone",
          isBlackHole: false,
          capturesMicrophone: true,
          capturesSystemAudio: false,
        };
      }
    }

    console.log("Detected devices:", {
      microphone: microphone?.label,
      systemAudio: systemAudio?.label,
    });

    return { microphone, systemAudio };
  } catch (err) {
    console.error("Failed to detect audio devices:", err);
    return { microphone: null, systemAudio: null };
  }
}

// Request microphone permission explicitly (triggers browser prompt)
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

// Legacy function for backwards compatibility
export async function detectBlackHole(): Promise<AudioDevice | null> {
  const devices = await detectAudioDevices();
  return devices.systemAudio;
}

// Get all available audio input devices
export async function getAudioDevices(): Promise<AudioDevice[]> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === "audioinput")
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
        type: isBlackHoleDevice(d.label) ? "blackhole" as AudioDeviceType : "microphone" as AudioDeviceType,
        isBlackHole: isBlackHoleDevice(d.label),
        capturesMicrophone: !isBlackHoleDevice(d.label),
        capturesSystemAudio: isBlackHoleDevice(d.label),
      }));
  } catch {
    return [];
  }
}

// Original single-stream AudioCapture class (kept for compatibility)
export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private options: AudioCaptureOptions;
  private state: AudioCaptureState = "idle";

  constructor(options: AudioCaptureOptions) {
    this.options = options;
  }

  async startCapture(deviceId?: string): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000,
          channelCount: 1,
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (this.state !== "capturing") return;
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.options.onAudioData(pcmData.buffer);
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.setState("capturing");
    } catch (error) {
      this.options.onError(
        error instanceof Error ? error : new Error("Failed to capture audio")
      );
      throw error;
    }
  }

  pause(): void {
    if (this.state === "capturing") {
      this.setState("paused");
    }
  }

  resume(): void {
    if (this.state === "paused") {
      this.setState("capturing");
    }
  }

  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.setState("stopped");
  }

  private setState(state: AudioCaptureState): void {
    this.state = state;
    this.options.onStateChange(state);
  }

  getState(): AudioCaptureState {
    return this.state;
  }
}

// Dual-stream audio capture: captures mic + system audio and mixes them
export class DualStreamCapture {
  private micStream: MediaStream | null = null;
  private systemStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private micGain: GainNode | null = null;
  private systemGain: GainNode | null = null;
  private options: AudioCaptureOptions;
  private state: AudioCaptureState = "idle";

  // Track which sources are active
  private hasMic: boolean = false;
  private hasSystem: boolean = false;

  constructor(options: AudioCaptureOptions) {
    this.options = options;
  }

  async startCapture(
    micDeviceId?: string,
    systemDeviceId?: string
  ): Promise<{ micActive: boolean; systemActive: boolean }> {
    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      const audioConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 16000,
        channelCount: 1,
      };

      // Create gain nodes for mixing
      this.micGain = this.audioContext.createGain();
      this.micGain.gain.value = 0.7; // Slightly reduce to prevent clipping

      this.systemGain = this.audioContext.createGain();
      this.systemGain.gain.value = 0.7;

      // Create a merger to combine both streams
      // We'll use a simple additive mix through a single gain node
      const mixerGain = this.audioContext.createGain();
      mixerGain.gain.value = 1.0;

      // Try to get microphone stream
      if (micDeviceId) {
        try {
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              ...audioConstraints,
              deviceId: { exact: micDeviceId },
            },
          });
          const micSource = this.audioContext.createMediaStreamSource(this.micStream);
          micSource.connect(this.micGain);
          this.micGain.connect(mixerGain);
          this.hasMic = true;
          console.log("Microphone connected");
        } catch (err) {
          console.warn("Could not connect microphone:", err);
        }
      }

      // Try to get system audio stream (BlackHole)
      if (systemDeviceId) {
        try {
          this.systemStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              ...audioConstraints,
              deviceId: { exact: systemDeviceId },
            },
          });
          const systemSource = this.audioContext.createMediaStreamSource(this.systemStream);
          systemSource.connect(this.systemGain);
          this.systemGain.connect(mixerGain);
          this.hasSystem = true;
          console.log("System audio (BlackHole) connected");
        } catch (err) {
          console.warn("Could not connect system audio:", err);
        }
      }

      // Ensure at least one source is connected
      if (!this.hasMic && !this.hasSystem) {
        throw new Error("No audio sources available");
      }

      // Create processor to capture mixed audio
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (this.state !== "capturing") return;

        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        this.options.onAudioData(pcmData.buffer);
      };

      // Connect mixer to processor
      mixerGain.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.setState("capturing");

      return {
        micActive: this.hasMic,
        systemActive: this.hasSystem,
      };
    } catch (error) {
      this.options.onError(
        error instanceof Error ? error : new Error("Failed to capture audio")
      );
      throw error;
    }
  }

  // Adjust microphone volume (0.0 - 1.0)
  setMicGain(gain: number): void {
    if (this.micGain) {
      this.micGain.gain.value = Math.max(0, Math.min(1, gain));
    }
  }

  // Adjust system audio volume (0.0 - 1.0)
  setSystemGain(gain: number): void {
    if (this.systemGain) {
      this.systemGain.gain.value = Math.max(0, Math.min(1, gain));
    }
  }

  pause(): void {
    if (this.state === "capturing") {
      this.setState("paused");
    }
  }

  resume(): void {
    if (this.state === "paused") {
      this.setState("capturing");
    }
  }

  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.micGain) {
      this.micGain.disconnect();
      this.micGain = null;
    }
    if (this.systemGain) {
      this.systemGain.disconnect();
      this.systemGain = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.systemStream) {
      this.systemStream.getTracks().forEach((track) => track.stop());
      this.systemStream = null;
    }
    this.hasMic = false;
    this.hasSystem = false;
    this.setState("stopped");
  }

  private setState(state: AudioCaptureState): void {
    this.state = state;
    this.options.onStateChange(state);
  }

  getState(): AudioCaptureState {
    return this.state;
  }

  // Check which sources are currently active
  getActiveStreams(): { mic: boolean; system: boolean } {
    return {
      mic: this.hasMic,
      system: this.hasSystem,
    };
  }
}
