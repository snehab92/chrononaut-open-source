"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import {
  DualStreamCapture,
  detectAudioDevices,
  requestMicrophonePermission,
  type AudioDevice,
  type DualAudioDevices
} from "@/lib/transcription/audio-capture";
import { DeepgramClient, type TranscriptSegment } from "@/lib/transcription/deepgram-client";
import { encryptContent, decryptContent, isEncryptionInitialized } from "@/lib/journal/encryption";
import {
  Mic,
  Square,
  Play,
  Pause,
  Sparkles,
  FileText,
  Clock,
  Settings,
  AlertCircle,
  Volume2,
  Check,
  X,
  Pencil,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Users,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BlackholeSetupModal } from "./BlackholeSetupModal";

interface TranscriptParagraph {
  id: string;
  speaker: number;
  speakerLabel: string;
  text: string; // Accumulated sentences for this speaker turn
  startTime: number;
  endTime: number;
}

// Silence threshold for auto-stop (30 seconds)
const SILENCE_THRESHOLD_MS = 30000;

// Markdown to HTML converter for beautiful summary rendering
function markdownToHtml(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check if this is a list item
    const unorderedMatch = line.match(/^[\-\*] (.+)$/);
    const orderedMatch = line.match(/^(\d+)\. (.+)$/);

    if (unorderedMatch) {
      // Close ordered list if open
      if (inOrderedList) {
        result.push('</ol>');
        inOrderedList = false;
      }
      // Open unordered list if not already
      if (!inUnorderedList) {
        result.push('<ul style="margin: 0.5em 0; padding-left: 1.5em;">');
        inUnorderedList = true;
      }
      let content = unorderedMatch[1];
      content = processInlineFormatting(content);
      result.push(`<li style="margin-bottom: 0.25em;">${content}</li>`);
    } else if (orderedMatch) {
      // Close unordered list if open
      if (inUnorderedList) {
        result.push('</ul>');
        inUnorderedList = false;
      }
      // Open ordered list if not already
      if (!inOrderedList) {
        result.push('<ol style="margin: 0.5em 0; padding-left: 1.5em;">');
        inOrderedList = true;
      }
      let content = orderedMatch[2];
      content = processInlineFormatting(content);
      result.push(`<li style="margin-bottom: 0.25em;">${content}</li>`);
    } else {
      // Close any open lists
      if (inUnorderedList) {
        result.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        result.push('</ol>');
        inOrderedList = false;
      }

      // Process headers
      if (line.match(/^### (.+)$/)) {
        line = line.replace(/^### (.+)$/, '<h3 style="font-size: 0.95rem; font-weight: 600; margin: 0.75em 0 0.25em 0; color: #1E3D32;">$1</h3>');
      } else if (line.match(/^## (.+)$/)) {
        line = line.replace(/^## (.+)$/, '<h2 style="font-size: 1.05rem; font-weight: 600; margin: 0.75em 0 0.25em 0; color: #1E3D32;">$1</h2>');
      } else if (line.match(/^# (.+)$/)) {
        line = line.replace(/^# (.+)$/, '<h1 style="font-size: 1.15rem; font-weight: 600; margin: 0.75em 0 0.25em 0; color: #1E3D32;">$1</h1>');
      } else if (line.trim() === '') {
        // Empty line - add spacing
        result.push('<div style="height: 0.5em;"></div>');
        continue;
      } else {
        // Regular paragraph
        line = processInlineFormatting(line);
        line = `<p style="margin: 0.25em 0;">${line}</p>`;
      }
      result.push(line);
    }
  }

  // Close any remaining open lists
  if (inUnorderedList) result.push('</ul>');
  if (inOrderedList) result.push('</ol>');

  return result.join('');
}

// Process inline formatting (bold, italic, code)
function processInlineFormatting(text: string): string {
  let result = text;
  // Bold and italic combined
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic (use lookahead/behind to avoid matching inside words)
  result = result.replace(/(?<![\\w*])\*([^*]+)\*(?![\\w*])/g, '<em>$1</em>');
  result = result.replace(/(?<![\\w_])_([^_]+)_(?![\\w_])/g, '<em>$1</em>');
  // Code
  result = result.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.05); padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.9em;">$1</code>');
  return result;
}

// Convert HTML back to markdown for storage
function htmlToMarkdown(html: string): string {
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();
    const childContent = Array.from(el.childNodes).map(processNode).join('');

    switch (tagName) {
      case 'h1':
        return `# ${childContent}\n`;
      case 'h2':
        return `## ${childContent}\n`;
      case 'h3':
        return `### ${childContent}\n`;
      case 'strong':
      case 'b':
        return `**${childContent}**`;
      case 'em':
      case 'i':
        return `*${childContent}*`;
      case 'code':
        return `\`${childContent}\``;
      case 'li':
        return `- ${childContent}\n`;
      case 'ul':
      case 'ol':
        return childContent;
      case 'p':
        return `${childContent}\n\n`;
      case 'br':
        return '\n';
      case 'div':
        // Handle spacing divs
        if (el.style.height) {
          return '\n';
        }
        return childContent;
      default:
        return childContent;
    }
  }

  const result = Array.from(temp.childNodes).map(processNode).join('');

  // Clean up extra newlines
  return result
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// For backwards compatibility with saved data
interface TranscriptLine {
  id: string;
  speaker: number;
  speakerLabel: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

type TranscriptionStatus = "idle" | "recording" | "paused" | "completed";
type ExpandedSection = "transcript" | "notes" | "summary";

export function MeetingTranscriptionWidget({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const [meetingNoteId, setMeetingNoteId] = useState<string | null>(
    node.attrs.meetingNoteId as string | null
  );
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [paragraphs, setParagraphs] = useState<TranscriptParagraph[]>([]);
  const [currentInterim, setCurrentInterim] = useState<{
    speaker: number;
    text: string;
    startTime: number;
  } | null>(null);
  const [manualNotes, setManualNotes] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [speakerMap, setSpeakerMap] = useState<Record<number, string>>({});
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<ExpandedSection>("summary");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [audioDevices, setAudioDevices] = useState<DualAudioDevices>({
    microphone: null,
    systemAudio: null,
  });
  const [activeStreams, setActiveStreams] = useState<{
    mic: boolean;
    system: boolean;
  }>({ mic: false, system: false });
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<string>("");
  const [isEditingSummary, setIsEditingSummary] = useState(false);

  // Calendar event ID for auto-populating attendees
  const calendarEventId = node.attrs.calendarEventId as string | null;

  // Ref to accumulate text for current paragraph before utterance end
  const currentParagraphBuffer = useRef<{
    speaker: number;
    texts: string[];
    startTime: number;
    endTime: number;
  } | null>(null);

  const audioCapture = useRef<DualStreamCapture | null>(null);
  const deepgramClient = useRef<DeepgramClient | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const lastSpeechTime = useRef<number>(Date.now());
  const silenceCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Detect audio devices on mount
  useEffect(() => {
    detectAudioDevices().then((devices) => {
      setAudioDevices(devices);
    });
  }, []);

  // Load existing session if meetingNoteId exists
  useEffect(() => {
    if (meetingNoteId) {
      loadExistingSession(meetingNoteId);
    }
  }, [meetingNoteId]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current && activeTab === "transcript") {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [paragraphs, currentInterim, activeTab]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (silenceCheckInterval.current) {
        clearInterval(silenceCheckInterval.current);
      }
    };
  }, []);

  // Auto-fetch calendar event attendees when linked to a calendar event
  useEffect(() => {
    if (calendarEventId && !participants) {
      fetch(`/api/calendar/events/${calendarEventId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.event?.attendees?.length > 0) {
            // Extract names from attendees (use displayName or email)
            const attendeeNames = data.event.attendees
              .map((a: { displayName?: string; email?: string }) =>
                a.displayName || a.email?.split("@")[0]
              )
              .filter(Boolean);
            if (attendeeNames.length > 0) {
              setParticipants(attendeeNames.join(", "));
            }
          }
        })
        .catch((err) => console.error("Failed to fetch calendar event:", err));
    }
  }, [calendarEventId, participants]);

  const loadExistingSession = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("meeting_notes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setStatus(data.transcription_status || "idle");
        setDuration(data.transcription_duration_seconds || 0);
        setSpeakerMap(data.speaker_map || {});

        // Load transcript segments (handle both encrypted and plain formats)
        // Supports both old line-based and new paragraph-based formats
        if (data.encrypted_transcript_segments?.length > 0) {
          const decryptedItems = await Promise.all(
            data.encrypted_transcript_segments.map(
              async (seg: { encrypted?: string; data?: TranscriptLine | TranscriptParagraph }) => {
                // Plain JSON format (unencrypted)
                if (seg.data) return seg.data;
                // Encrypted format
                if (seg.encrypted) {
                  const decrypted = await decryptContent(seg.encrypted);
                  return decrypted ? JSON.parse(decrypted) : null;
                }
                return null;
              }
            )
          );
          const validItems = decryptedItems.filter(Boolean);

          // Check if it's old line format (has isFinal) or new paragraph format (has startTime)
          if (validItems.length > 0 && 'isFinal' in validItems[0]) {
            // Convert old line format to paragraphs
            const lines = validItems as TranscriptLine[];
            const convertedParagraphs: TranscriptParagraph[] = [];
            let currentPara: TranscriptParagraph | null = null;

            for (const line of lines.filter(l => l.isFinal)) {
              if (currentPara && currentPara.speaker === line.speaker) {
                // Same speaker - append text
                currentPara.text += " " + line.text;
                currentPara.endTime = line.timestamp;
              } else {
                // New speaker or first line
                if (currentPara) convertedParagraphs.push(currentPara);
                currentPara = {
                  id: line.id,
                  speaker: line.speaker,
                  speakerLabel: line.speakerLabel,
                  text: line.text,
                  startTime: line.timestamp,
                  endTime: line.timestamp,
                };
              }
            }
            if (currentPara) convertedParagraphs.push(currentPara);
            setParagraphs(convertedParagraphs);
          } else {
            // New paragraph format
            setParagraphs(validItems as TranscriptParagraph[]);
          }
        }

        // Load manual notes (try decrypt, fall back to plain text)
        if (data.encrypted_meeting_notes) {
          const notes = await decryptContent(data.encrypted_meeting_notes);
          // If decryption fails/returns null, it might be plain text
          setManualNotes(notes || data.encrypted_meeting_notes || "");
        }

        // Load AI summary (try decrypt, fall back to plain text)
        if (data.encrypted_ai_summary) {
          const summary = await decryptContent(data.encrypted_ai_summary);
          setAiSummary(summary || data.encrypted_ai_summary || "");
        }
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  const createMeetingNote = async (): Promise<string | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("meeting_notes")
        .insert({
          user_id: user.id,
          title: `Transcription - ${new Date().toLocaleDateString()}`,
          transcription_status: "recording",
          transcription_started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMeetingNoteId(data.id);
        updateAttributes({ meetingNoteId: data.id });
        return data.id;
      }
      return null;
    } catch (err) {
      console.error("Failed to create meeting note:", err);
      setError("Failed to create meeting record");
      return null;
    }
  };

  // Finalize current paragraph buffer into a paragraph
  const finalizeParagraph = useCallback(() => {
    if (currentParagraphBuffer.current && currentParagraphBuffer.current.texts.length > 0) {
      const buffer = currentParagraphBuffer.current;
      const speakerLabel = speakerMap[buffer.speaker] || `Speaker ${buffer.speaker + 1}`;

      const paragraph: TranscriptParagraph = {
        id: `para-${Date.now()}-${buffer.startTime}`,
        speaker: buffer.speaker,
        speakerLabel,
        text: buffer.texts.join(" "),
        startTime: buffer.startTime,
        endTime: buffer.endTime,
      };

      setParagraphs((prev) => [...prev, paragraph]);
      currentParagraphBuffer.current = null;
      setCurrentInterim(null);
    }
  }, [speakerMap]);

  // Handle utterance end - finalize current paragraph
  const handleUtteranceEnd = useCallback(() => {
    finalizeParagraph();
  }, [finalizeParagraph]);

  const handleTranscript = useCallback((segment: TranscriptSegment) => {
    // Reset silence timer on any speech
    lastSpeechTime.current = Date.now();

    // Auto-add new speakers to map
    setSpeakerMap((prev) => {
      if (!prev[segment.speaker]) {
        return {
          ...prev,
          [segment.speaker]: `Speaker ${segment.speaker + 1}`,
        };
      }
      return prev;
    });

    if (segment.isFinal) {
      // Check if speaker changed - finalize previous paragraph
      if (currentParagraphBuffer.current && currentParagraphBuffer.current.speaker !== segment.speaker) {
        finalizeParagraph();
      }

      // Add to current paragraph buffer
      if (!currentParagraphBuffer.current) {
        currentParagraphBuffer.current = {
          speaker: segment.speaker,
          texts: [segment.text],
          startTime: segment.start,
          endTime: segment.end,
        };
      } else {
        currentParagraphBuffer.current.texts.push(segment.text);
        currentParagraphBuffer.current.endTime = segment.end;
      }

      // Update interim display with accumulated text
      setCurrentInterim({
        speaker: segment.speaker,
        text: currentParagraphBuffer.current.texts.join(" "),
        startTime: currentParagraphBuffer.current.startTime,
      });
    } else {
      // Show interim result (non-final)
      const bufferText = currentParagraphBuffer.current?.speaker === segment.speaker
        ? currentParagraphBuffer.current.texts.join(" ") + " "
        : "";

      setCurrentInterim({
        speaker: segment.speaker,
        text: bufferText + segment.text,
        startTime: segment.start,
      });
    }
  }, [finalizeParagraph]);

  const startRecording = async () => {
    setError(null);
    setIsConnecting(true);

    // Request microphone permission first (this is when browser prompt appears)
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      setError("Microphone permission denied. Please allow microphone access to record.");
      setIsConnecting(false);
      return;
    }

    // Re-detect devices now that we have permission (to get labels)
    const devices = await detectAudioDevices();
    setAudioDevices(devices);

    // Check if we have at least one audio source
    const hasMic = !!devices.microphone;
    const hasSystem = !!devices.systemAudio;

    // If no system audio (BlackHole), show setup but allow mic-only
    if (!hasSystem && !hasMic) {
      setShowSetupModal(true);
      setIsConnecting(false);
      return;
    }

    try {
      // Create meeting note if not exists
      let noteId = meetingNoteId;
      if (!noteId) {
        noteId = await createMeetingNote();
        if (!noteId) {
          setIsConnecting(false);
          return;
        }
      }

      // Get Deepgram token
      const tokenRes = await fetch("/api/transcription/connect", {
        method: "POST",
      });
      if (!tokenRes.ok) {
        throw new Error("Failed to connect to transcription service");
      }
      const { token } = await tokenRes.json();

      // Initialize Deepgram client
      deepgramClient.current = new DeepgramClient({
        onTranscript: handleTranscript,
        onUtteranceEnd: handleUtteranceEnd,
        onError: (err) => {
          console.error("Deepgram error:", err);
          setError("Transcription connection lost");
        },
        onConnectionChange: (connected) => {
          if (!connected && status === "recording") {
            setStatus("paused");
            setError("Connection lost - click Resume to reconnect");
          }
        },
      });

      await deepgramClient.current.connect(token);

      // Initialize dual-stream audio capture (mic + system)
      audioCapture.current = new DualStreamCapture({
        onAudioData: (data) => {
          deepgramClient.current?.sendAudio(data);
        },
        onError: (err) => {
          console.error("Audio capture error:", err);
          setError("Audio capture failed");
        },
        onStateChange: () => {},
      });

      // Start capture with both devices (if available)
      // For aggregate devices, systemAudio contains both mic + system
      const micId = devices.systemAudio?.capturesMicrophone
        ? undefined // Aggregate device already has mic
        : devices.microphone?.deviceId;
      const systemId = devices.systemAudio?.deviceId;

      const result = await audioCapture.current.startCapture(micId, systemId);
      setActiveStreams({ mic: result.micActive, system: result.systemActive });
      setStatus("recording");
      setIsConnecting(false);

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      // Start silence detection - auto-pause after 30 seconds of silence
      lastSpeechTime.current = Date.now();
      silenceCheckInterval.current = setInterval(() => {
        const silenceDuration = Date.now() - lastSpeechTime.current;
        if (silenceDuration >= SILENCE_THRESHOLD_MS) {
          console.log("Auto-pausing due to silence");
          pauseRecording();
        }
      }, 5000); // Check every 5 seconds

      // Update database status
      await supabase
        .from("meeting_notes")
        .update({
          transcription_status: "recording",
          transcription_started_at: new Date().toISOString(),
        })
        .eq("id", noteId);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setIsConnecting(false);
    }
  };

  const pauseRecording = async () => {
    audioCapture.current?.pause();
    setStatus("paused");
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    if (silenceCheckInterval.current) {
      clearInterval(silenceCheckInterval.current);
      silenceCheckInterval.current = null;
    }
    await saveSession();
  };

  const resumeRecording = async () => {
    setError(null);

    // Reconnect if needed
    if (!deepgramClient.current?.isConnected()) {
      try {
        const tokenRes = await fetch("/api/transcription/connect", {
          method: "POST",
        });
        const { token } = await tokenRes.json();
        await deepgramClient.current?.connect(token);
      } catch (err) {
        setError("Failed to reconnect");
        return;
      }
    }

    audioCapture.current?.resume();
    setStatus("recording");
    durationInterval.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    // Restart silence detection
    lastSpeechTime.current = Date.now();
    silenceCheckInterval.current = setInterval(() => {
      const silenceDuration = Date.now() - lastSpeechTime.current;
      if (silenceDuration >= SILENCE_THRESHOLD_MS) {
        console.log("Auto-pausing due to silence");
        pauseRecording();
      }
    }, 5000);

    if (meetingNoteId) {
      await supabase
        .from("meeting_notes")
        .update({ transcription_status: "recording" })
        .eq("id", meetingNoteId);
    }
  };

  const stopRecording = async (autoGenerateSummary = true) => {
    // Finalize any pending paragraph
    finalizeParagraph();

    audioCapture.current?.stop();
    deepgramClient.current?.disconnect();
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    if (silenceCheckInterval.current) {
      clearInterval(silenceCheckInterval.current);
      silenceCheckInterval.current = null;
    }
    setStatus("completed");
    await saveSession();

    if (meetingNoteId) {
      await supabase
        .from("meeting_notes")
        .update({
          transcription_status: "completed",
          transcription_ended_at: new Date().toISOString(),
        })
        .eq("id", meetingNoteId);
    }

    // Auto-generate summary if we have transcript content
    if (autoGenerateSummary && paragraphs.length > 0) {
      await generateSummary();
    }
  };

  const saveSession = async () => {
    if (!meetingNoteId) return;

    try {
      const useEncryption = isEncryptionInitialized();

      // Prepare transcript paragraphs (encrypt if available, otherwise store as JSON)
      const encryptedSegments = useEncryption
        ? await Promise.all(
            paragraphs.map(async (para) => ({
              encrypted: await encryptContent(JSON.stringify(para)),
            }))
          )
        : paragraphs.map((para) => ({ data: para })); // Store as plain JSON

      // Prepare manual notes
      const encryptedNotes = manualNotes
        ? useEncryption
          ? await encryptContent(manualNotes)
          : manualNotes
        : null;

      // Prepare AI summary
      const encryptedSummary = aiSummary
        ? useEncryption
          ? await encryptContent(aiSummary)
          : aiSummary
        : null;

      await supabase
        .from("meeting_notes")
        .update({
          transcription_duration_seconds: duration,
          speaker_map: speakerMap,
          encrypted_transcript_segments: encryptedSegments,
          encrypted_meeting_notes: encryptedNotes,
          encrypted_ai_summary: encryptedSummary,
        })
        .eq("id", meetingNoteId);
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  };

  // Get unique speaker names for prompt enforcement
  const getUniqueSpealerNames = (): string[] => {
    const names = new Set<string>();
    Object.values(speakerMap).forEach(name => {
      if (name && !name.startsWith("Speaker ")) {
        names.add(name);
      }
    });
    return Array.from(names);
  };

  const generateSummary = async () => {
    if (paragraphs.length === 0) return;

    setIsGeneratingSummary(true);
    setActiveTab("summary");
    setIsEditingSummary(false);

    try {
      const fullTranscript = paragraphs
        .map((p) => `${speakerMap[p.speaker] || p.speakerLabel}: ${p.text}`)
        .join("\n\n");

      // Pass speaker names for spelling enforcement
      const speakerNames = getUniqueSpealerNames();

      const res = await fetch("/api/transcription/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: fullTranscript,
          meetingNoteId,
          speakerNames: speakerNames.length > 0 ? speakerNames : undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate summary");

      const { summary } = await res.json();
      setAiSummary(summary);
      await saveSession();
    } catch (err) {
      console.error("Summary generation failed:", err);
      setError("Failed to generate summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Parse participants from comma-separated string
  const participantList = participants
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Handle speaker rename
  const handleSpeakerRename = (speakerNum: number, newName: string) => {
    setSpeakerMap((prev) => ({ ...prev, [speakerNum]: newName }));
    // Update paragraphs to reflect new name
    setParagraphs((prev) =>
      prev.map((p) =>
        p.speaker === speakerNum ? { ...p, speakerLabel: newName } : p
      )
    );
  };

  return (
    <NodeViewWrapper className="my-4" data-drag-handle>
      <Card className="border-[#E8DCC4] bg-white">
        <CardHeader className={cn("pb-2", isCollapsed && "py-3")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#5C7A6B]" />
              Meeting Transcription
              {status === "recording" && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              {status === "completed" && paragraphs.length > 0 && (
                <span className="text-xs text-[#8B9A8F] font-normal">
                  ({paragraphs.length} segments)
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8B9A8F] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(duration)}
              </span>

              {/* Collapse button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-7 w-7 text-[#8B9A8F] hover:text-[#1E3D32]"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>

              {/* Delete button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm("Are you sure you want to remove this transcription widget?")) {
                    deleteNode();
                  }
                }}
                className="h-7 w-7 text-[#8B9A8F] hover:text-red-600"
                title="Remove widget"
              >
                <Trash2 className="w-4 h-4" />
              </Button>

              {/* Device status indicator */}
              {status !== "idle" && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={cn(
                      "flex items-center gap-0.5 px-1.5 py-0.5 rounded",
                      activeStreams.mic
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    )}
                    title={audioDevices.microphone?.label || "No microphone"}
                  >
                    <Mic className="w-3 h-3" />
                    {activeStreams.mic ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-0.5 px-1.5 py-0.5 rounded",
                      activeStreams.system
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    )}
                    title={audioDevices.systemAudio?.label || "No system audio"}
                  >
                    <Volume2 className="w-3 h-3" />
                    {activeStreams.system ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                  </span>
                </div>
              )}

              {!audioDevices.systemAudio && status === "idle" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSetupModal(true)}
                  className="text-xs"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Setup
                </Button>
              )}

              {status === "idle" && (
                <Button
                  size="sm"
                  onClick={startRecording}
                  disabled={isConnecting}
                  className="bg-[#2D5A47] hover:bg-[#1E3D32]"
                >
                  {isConnecting ? (
                    "Connecting..."
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-1" />
                      Start
                    </>
                  )}
                </Button>
              )}

              {status === "recording" && (
                <>
                  <Button size="sm" variant="outline" onClick={pauseRecording}>
                    <Pause className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => stopRecording()}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </>
              )}

              {status === "paused" && (
                <>
                  <Button size="sm" variant="outline" onClick={resumeRecording}>
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => stopRecording()}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </>
              )}

              {status === "completed" && (
                <>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={startRecording}
                    disabled={isConnecting}
                    className="h-7 w-7 text-[#2D5A47] border-[#2D5A47] hover:bg-[#2D5A47]/10"
                    title="Continue recording"
                  >
                    {isConnecting ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    onClick={generateSummary}
                    disabled={isGeneratingSummary || paragraphs.length === 0}
                    className="h-7 w-7 bg-[#D4A84B] hover:bg-[#C49A3D]"
                    title="Generate AI summary"
                  >
                    {isGeneratingSummary ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          )}
        </CardHeader>

        {!isCollapsed && (
        <CardContent className="pt-0">
          {/* Participants input - show before recording starts */}
          {status === "idle" && (
            <div className="mb-3 pb-3 border-b border-[#E8DCC4]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#8B9A8F]" />
                <Input
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  placeholder="Participants: Carsten, Sneha, John..."
                  className="h-8 text-sm border-[#E8DCC4] focus:border-[#2D5A47] placeholder:text-[#8B9A8F]/60"
                />
              </div>
              <p className="text-xs text-[#8B9A8F] mt-1.5 ml-6">
                Add participant names to quickly assign speakers during transcription
              </p>
            </div>
          )}

          {/* Horizontal Tab Bar - Order: AI Summary (left), Notes (middle), Transcript (right) */}
          <div className="flex gap-1 border-b border-[#E8DCC4] mb-3">
            <button
              onClick={() => setActiveTab("summary")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-t-md",
                activeTab === "summary"
                  ? "bg-[#F5F0E6] text-[#1E3D32] border-b-2 border-[#2D5A47]"
                  : "text-[#8B9A8F] hover:text-[#1E3D32] hover:bg-[#F5F0E6]/50"
              )}
            >
              <Sparkles className="w-4 h-4 text-[#D4A84B]" />
              AI Summary
            </button>

            <button
              onClick={() => setActiveTab("notes")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-t-md",
                activeTab === "notes"
                  ? "bg-[#F5F0E6] text-[#1E3D32] border-b-2 border-[#2D5A47]"
                  : "text-[#8B9A8F] hover:text-[#1E3D32] hover:bg-[#F5F0E6]/50"
              )}
            >
              <FileText className="w-4 h-4" />
              Notes
            </button>

            <button
              onClick={() => setActiveTab("transcript")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-t-md",
                activeTab === "transcript"
                  ? "bg-[#F5F0E6] text-[#1E3D32] border-b-2 border-[#2D5A47]"
                  : "text-[#8B9A8F] hover:text-[#1E3D32] hover:bg-[#F5F0E6]/50"
              )}
            >
              <Mic className="w-4 h-4" />
              Transcript
              {paragraphs.length > 0 && (
                <span className="text-xs bg-[#E8DCC4] px-1.5 py-0.5 rounded-full">
                  {paragraphs.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {/* Transcript Tab */}
            {activeTab === "transcript" && (
              <div className="max-h-60 overflow-y-auto space-y-4 pr-2">
                {paragraphs.length === 0 && !currentInterim ? (
                  <p className="text-sm text-[#8B9A8F] italic">
                    {status === "idle"
                      ? "Start recording to see transcript..."
                      : status === "recording"
                        ? "Listening..."
                        : "No transcript recorded."}
                  </p>
                ) : (
                  <>
                    {/* Finalized paragraphs */}
                    {paragraphs.map((para) => (
                      <div key={para.id} className="text-sm">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="font-medium text-[#5C7A6B] hover:text-[#2D5A47] hover:underline cursor-pointer inline-flex items-center gap-0.5 transition-colors">
                              {speakerMap[para.speaker] || para.speakerLabel}
                              <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="min-w-[140px]">
                            {participantList.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs text-[#8B9A8F] font-medium">
                                  Participants
                                </div>
                                {participantList.map((name) => (
                                  <DropdownMenuItem
                                    key={name}
                                    onClick={() => handleSpeakerRename(para.speaker, name)}
                                    className="text-sm"
                                  >
                                    {name}
                                  </DropdownMenuItem>
                                ))}
                                <div className="h-px bg-[#E8DCC4] my-1" />
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                const newName = prompt(
                                  `Rename "${speakerMap[para.speaker] || para.speakerLabel}" to:`,
                                  speakerMap[para.speaker] || ""
                                );
                                if (newName && newName.trim()) {
                                  handleSpeakerRename(para.speaker, newName.trim());
                                }
                              }}
                              className="text-sm"
                            >
                              <Pencil className="w-3 h-3 mr-2" />
                              Custom name...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <span className="text-[#5C7A6B]">:</span>
                        <p className="text-[#1E3D32] mt-0.5 leading-relaxed">
                          {para.text}
                        </p>
                      </div>
                    ))}

                    {/* Current interim (live transcription) */}
                    {currentInterim && (
                      <div className="text-sm opacity-70">
                        <span className="font-medium text-[#5C7A6B]">
                          {speakerMap[currentInterim.speaker] || `Speaker ${currentInterim.speaker + 1}`}:
                        </span>
                        <p className="text-[#1E3D32] mt-0.5 leading-relaxed animate-pulse">
                          {currentInterim.text}
                        </p>
                      </div>
                    )}
                  </>
                )}
                <div ref={transcriptEndRef} />
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === "notes" && (
              <Textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                onBlur={saveSession}
                placeholder="Add your notes here..."
                className="min-h-[200px] border-[#E8DCC4] focus:border-[#2D5A47] resize-none"
              />
            )}

            {/* AI Summary Tab */}
            {activeTab === "summary" && (
              <div>
                {aiSummary ? (
                  <>
                    {/* Edit toggle button */}
                    <div className="flex justify-end mb-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (isEditingSummary) {
                            saveSession();
                          }
                          setIsEditingSummary(!isEditingSummary);
                        }}
                        className="h-7 text-xs text-[#8B9A8F] hover:text-[#1E3D32]"
                      >
                        {isEditingSummary ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Done
                          </>
                        ) : (
                          <>
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </>
                        )}
                      </Button>
                    </div>
                    <div
                      contentEditable={isEditingSummary}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => {
                        if (isEditingSummary) {
                          // Convert HTML back to simplified markdown
                          const html = e.currentTarget.innerHTML;
                          const markdown = htmlToMarkdown(html);
                          setAiSummary(markdown);
                        }
                      }}
                      className={cn(
                        "prose prose-sm max-w-none text-[#1E3D32] [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_li]:my-0.5 [&_p]:my-1 [&_strong]:text-[#1E3D32] [&_code]:bg-[#F5F0E6] [&_code]:text-[#2D5A47]",
                        isEditingSummary && "min-h-[200px] border border-[#E8DCC4] rounded-md p-3 focus:border-[#2D5A47] focus:outline-none cursor-text"
                      )}
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(aiSummary) }}
                    />
                  </>
                ) : (
                  <p className="text-sm text-[#8B9A8F] italic">
                    {isGeneratingSummary
                      ? "Generating summary..."
                      : status === "completed"
                        ? "Click the sparkle icon to generate an AI summary."
                        : "Complete the transcription to generate an AI summary."}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
        )}
      </Card>

      {/* BlackHole Setup Modal */}
      <BlackholeSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onComplete={async () => {
          setShowSetupModal(false);
          const devices = await detectAudioDevices();
          setAudioDevices(devices);
          if (devices.microphone || devices.systemAudio) {
            startRecording();
          }
        }}
      />
    </NodeViewWrapper>
  );
}
