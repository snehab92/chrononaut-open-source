"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar,
  MapPin,
  Image as ImageIcon,
  Sparkles,
  Lock,
  Save,
  Loader2,
  X,
  ChevronDown,
  Tag,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  encryptJournalEntry,
  decryptJournalEntry,
  isEncryptionInitialized,
  initializeEncryption,
  verifyPassphrase,
} from "@/lib/journal/encryption";
import { parseExifFromFile, reverseGeocode, ExifData } from "@/lib/journal/exif-parser";

const MOOD_OPTIONS = [
  { value: "Calm", emoji: "😌", color: "bg-green-100 text-green-800" },
  { value: "Creative", emoji: "✨", color: "bg-purple-100 text-purple-800" },
  { value: "Adventurous", emoji: "🚀", color: "bg-blue-100 text-blue-800" },
  { value: "Socially Connected", emoji: "💛", color: "bg-yellow-100 text-yellow-800" },
  { value: "Acceptance", emoji: "🙏", color: "bg-teal-100 text-teal-800" },
  { value: "Romantic", emoji: "💕", color: "bg-pink-100 text-pink-800" },
  { value: "Stressed", emoji: "😰", color: "bg-orange-100 text-orange-800" },
  { value: "Unfocused", emoji: "🌀", color: "bg-gray-100 text-gray-800" },
  { value: "Threatened", emoji: "😨", color: "bg-red-100 text-red-800" },
  { value: "Rejected", emoji: "😔", color: "bg-indigo-100 text-indigo-800" },
  { value: "Angry", emoji: "😤", color: "bg-red-100 text-red-800" },
  { value: "Manic", emoji: "⚡", color: "bg-amber-100 text-amber-800" },
];

interface JournalEntry {
  id?: string;
  entry_date: string;
  encrypted_happened?: string | null;
  encrypted_feelings?: string | null;
  encrypted_grateful?: string | null;
  location_name?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  photo_url?: string | null;
  tags?: string[];
  mood_label?: string | null;
  mood_override?: boolean;
  energy_rating?: number | null;
  energy_override?: boolean;
}

interface JournalComposerProps {
  date: string; // YYYY-MM-DD format
  onSaved?: () => void;
}

export function JournalComposer({ date, onSaved }: JournalComposerProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Entry state
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [happened, setHappened] = useState("");
  const [feelings, setFeelings] = useState("");
  const [grateful, setGrateful] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [moodLabel, setMoodLabel] = useState<string | null>(null);
  const [moodOverride, setMoodOverride] = useState(false);
  const [energyRating, setEnergyRating] = useState<number | null>(null);
  const [energyOverride, setEnergyOverride] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInferring, setIsInferring] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Tag suggestions from previous entries + current session
  const [allTags, setAllTags] = useState<string[]>([]);
  const [sessionTags, setSessionTags] = useState<string[]>([]); // Tags used this session
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Encryption state
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [showPassphraseDialog, setShowPassphraseDialog] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseError, setPassphraseError] = useState("");
  const [isNewEncryption, setIsNewEncryption] = useState(false);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Load entry on mount/date change
  useEffect(() => {
    loadEntry();
    loadAllTags();
  }, [date]);

  // Load all tags from previous entries for suggestions
  const loadAllTags = async () => {
    try {
      const { data } = await supabase
        .from("journal_entries")
        .select("tags")
        .not("tags", "is", null);

      if (data) {
        const tagSet = new Set<string>();
        data.forEach((entry) => {
          entry.tags?.forEach((tag: string) => tagSet.add(tag));
        });
        setAllTags(Array.from(tagSet).sort());
      }
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  };

  const loadEntry = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/journal?date=${date}`);
      const data = await response.json();

      if (data.entry) {
        setEntry(data.entry);
        setLocationName(data.entry.location_name || "");
        setLocationLat(data.entry.location_lat);
        setLocationLng(data.entry.location_lng);
        setPhotoUrl(data.entry.photo_url);
        setTags(data.entry.tags || []);
        setMoodLabel(data.entry.mood_label);
        setMoodOverride(data.entry.mood_override || false);
        setEnergyRating(data.entry.energy_rating);
        setEnergyOverride(data.entry.energy_override || false);

        // Check if encrypted content exists
        if (
          data.entry.encrypted_happened ||
          data.entry.encrypted_feelings ||
          data.entry.encrypted_grateful
        ) {
          setIsEncrypted(true);
          // Need passphrase to decrypt
          if (isEncryptionInitialized()) {
            await decryptEntry(data.entry);
          } else {
            setShowPassphraseDialog(true);
            setIsNewEncryption(false);
          }
        }
      } else {
        // New entry
        setEntry({ entry_date: date });
        setIsEncrypted(false);
      }
    } catch (error) {
      console.error("Failed to load entry:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const decryptEntry = async (entryData: JournalEntry) => {
    try {
      const decrypted = await decryptJournalEntry({
        encrypted_happened: entryData.encrypted_happened,
        encrypted_feelings: entryData.encrypted_feelings,
        encrypted_grateful: entryData.encrypted_grateful,
      });
      setHappened(decrypted.happened);
      setFeelings(decrypted.feelings);
      setGrateful(decrypted.grateful);
    } catch {
      console.error("Decryption failed");
      setShowPassphraseDialog(true);
    }
  };

  // Handle passphrase submission
  const handlePassphraseSubmit = async () => {
    setPassphraseError("");

    if (isNewEncryption) {
      // First time setup
      if (passphrase.length < 8) {
        setPassphraseError("Passphrase must be at least 8 characters");
        return;
      }
      await initializeEncryption(passphrase);
      setShowPassphraseDialog(false);
      setIsEncrypted(true);
    } else {
      // Verify existing passphrase
      const isValid = await verifyPassphrase(passphrase);
      if (!isValid) {
        setPassphraseError("Incorrect passphrase");
        return;
      }
      setShowPassphraseDialog(false);
      if (entry) {
        await decryptEntry(entry);
      }
    }
    setPassphrase("");
  };

  // Save entry
  const saveEntry = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      // Encrypt content if encryption is initialized
      let encrypted = {
        encrypted_happened: null as string | null,
        encrypted_feelings: null as string | null,
        encrypted_grateful: null as string | null,
      };

      if (isEncryptionInitialized() && (happened || feelings || grateful)) {
        encrypted = await encryptJournalEntry({ happened, feelings, grateful });
        setIsEncrypted(true);
      }

      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_date: date,
          ...encrypted,
          location_name: locationName || null,
          location_lat: locationLat,
          location_lng: locationLng,
          photo_url: photoUrl,
          tags,
          mood_label: moodLabel,
          mood_override: moodOverride,
          energy_rating: energyRating,
          energy_override: energyOverride,
        }),
      });

      const data = await response.json();
      if (data.entry) {
        setEntry(data.entry);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        onSaved?.();
      }
    } catch (error) {
      console.error("Failed to save entry:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    date, happened, feelings, grateful, locationName, locationLat, locationLng,
    photoUrl, tags, moodLabel, moodOverride, energyRating, energyOverride,
    isSaving, onSaved,
  ]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      saveEntry();
    }, 30000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, saveEntry]);

  // Mark as having unsaved changes
  useEffect(() => {
    if (!isLoading) {
      setHasUnsavedChanges(true);
    }
  }, [happened, feelings, grateful, locationName, tags, moodLabel, energyRating]);

  // Get AI inference
  const getAiInference = async () => {
    if (!happened && !feelings && !grateful) return;

    setIsInferring(true);
    try {
      // Decrypt for inference if needed
      const response = await fetch("/api/journal/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ happened, feelings, grateful }),
      });

      const data = await response.json();
      if (data.mood_label && !moodOverride) {
        setMoodLabel(data.mood_label);
      }
      if (data.energy_rating && !energyOverride) {
        setEnergyRating(data.energy_rating);
      }
    } catch (error) {
      console.error("AI inference failed:", error);
    } finally {
      setIsInferring(false);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Parse EXIF data
      const exif = await parseExifFromFile(file);

      // Set location from EXIF if available
      if (exif.latitude && exif.longitude) {
        setLocationLat(exif.latitude);
        setLocationLng(exif.longitude);

        // Reverse geocode
        const locName = await reverseGeocode(exif.latitude, exif.longitude);
        if (locName) {
          setLocationName(locName);
        }
      }

      // Upload photo
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entry_date", date);

      const response = await fetch("/api/journal/photo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (data.url) {
        setPhotoUrl(data.url);
      }
    } catch (error) {
      console.error("Photo upload failed:", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to upload. Make sure storage bucket 'journal-photos' exists in Supabase."
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Add tag
  const addTag = (tagToAdd?: string) => {
    const tag = (tagToAdd || tagInput).trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      // Track in session tags for suggestions
      if (!sessionTags.includes(tag)) {
        setSessionTags([...sessionTags, tag]);
      }
    }
    setTagInput("");
  };

  // Remove tag
  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocationLat(position.coords.latitude);
        setLocationLng(position.coords.longitude);

        const locName = await reverseGeocode(
          position.coords.latitude,
          position.coords.longitude
        );
        if (locName) {
          setLocationName(locName);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#5C7A6B]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-[#1E3D32]">
            {formatDate(date)}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {isEncrypted && (
              <Badge variant="outline" className="text-xs gap-1">
                <Lock className="w-3 h-3" />
                Encrypted
              </Badge>
            )}
            {lastSaved && (
              <span className="text-xs text-[#8B9A8F]">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <Button
          onClick={saveEntry}
          disabled={isSaving || !hasUnsavedChanges}
          className="bg-[#2D5A47] hover:bg-[#1E3D32]"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </Button>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          className="text-[#5C7A6B]"
        >
          <MapPin className="w-4 h-4 mr-1" />
          {locationName || "Add location"}
        </Button>
        {locationName && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocationName("");
              setLocationLat(null);
              setLocationLng(null);
            }}
            className="h-8 w-8 p-0 text-[#8B9A8F]"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Photo */}
      <div className="mb-6">
        {photoUrl ? (
          <div className="relative rounded-lg overflow-hidden">
            <img
              src={photoUrl}
              alt="Journal photo"
              className="w-full max-h-80 object-cover"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPhotoUrl(null)}
              className="absolute top-2 right-2 bg-white/80 hover:bg-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8",
              "flex flex-col items-center justify-center cursor-pointer",
              "transition-colors",
              uploadError
                ? "border-red-300 bg-red-50"
                : "border-[#E8DCC4] hover:border-[#5C7A6B]"
            )}
          >
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-[#5C7A6B]" />
            ) : uploadError ? (
              <>
                <X className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-sm text-red-600 text-center">
                  {uploadError}
                </p>
                <p className="text-xs text-red-400 mt-1">
                  Click to try again
                </p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#8B9A8F] mb-2" />
                <p className="text-sm text-[#8B9A8F]">
                  Drop a photo or click to upload
                </p>
                <p className="text-xs text-[#8B9A8F] mt-1">
                  Location will be extracted from photo
                </p>
              </>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>

      {/* Text Areas */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-[#1E3D32] mb-2">
            What happened today?
          </label>
          <Textarea
            value={happened}
            onChange={(e) => setHappened(e.target.value)}
            placeholder="Describe your day..."
            className="min-h-[120px] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E3D32] mb-2">
            How are you feeling?
          </label>
          <Textarea
            value={feelings}
            onChange={(e) => setFeelings(e.target.value)}
            placeholder="Express your emotions..."
            className="min-h-[100px] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1E3D32] mb-2">
            What are you grateful for?
          </label>
          <Textarea
            value={grateful}
            onChange={(e) => setGrateful(e.target.value)}
            placeholder="List things you're thankful for..."
            className="min-h-[80px] resize-none"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#1E3D32] mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer hover:bg-red-100"
              onClick={() => removeTag(tag)}
            >
              {tag}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
        <div className="relative">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowTagSuggestions(true);
              }}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              placeholder="Add tag..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addTag()}
            />
            <Button variant="outline" onClick={() => addTag()}>
              <Tag className="w-4 h-4" />
            </Button>
          </div>
          {/* Tag suggestions dropdown */}
          {showTagSuggestions && (allTags.length > 0 || sessionTags.length > 0) && (
            <div className="absolute top-full left-0 right-12 mt-1 bg-white border border-[#E8DCC4] rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
              {/* Combine database tags and session tags, dedupe */}
              {Array.from(new Set([...allTags, ...sessionTags]))
                .sort()
                .filter(
                  (t) =>
                    !tags.includes(t) &&
                    (tagInput === "" || t.includes(tagInput.toLowerCase()))
                )
                .slice(0, 8)
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[#F5F0E6] transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(tag);
                      setShowTagSuggestions(false);
                    }}
                  >
                    {tag}
                  </button>
                ))}
              {Array.from(new Set([...allTags, ...sessionTags])).filter(
                (t) =>
                  !tags.includes(t) &&
                  (tagInput === "" || t.includes(tagInput.toLowerCase()))
              ).length === 0 && (
                <p className="px-3 py-2 text-sm text-[#8B9A8F]">
                  {tagInput ? "No matching tags" : "No previous tags"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Inference Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-medium text-[#1E3D32]">AI Insights</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={getAiInference}
            disabled={isInferring || (!happened && !feelings && !grateful)}
          >
            {isInferring ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Get Insights"
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Mood */}
          <div>
            <label className="block text-xs text-[#5C7A6B] mb-1">Mood</label>
            <Select
              value={moodLabel || ""}
              onValueChange={(v) => {
                setMoodLabel(v);
                setMoodOverride(true);
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select mood" />
              </SelectTrigger>
              <SelectContent>
                {MOOD_OPTIONS.map((mood) => (
                  <SelectItem key={mood.value} value={mood.value}>
                    <span className="flex items-center gap-2">
                      <span>{mood.emoji}</span>
                      {mood.value}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {moodLabel && !moodOverride && (
              <p className="text-xs text-purple-600 mt-1">AI suggested</p>
            )}
          </div>

          {/* Energy */}
          <div>
            <label className="block text-xs text-[#5C7A6B] mb-1">
              Energy (1-10)
            </label>
            <Select
              value={energyRating?.toString() || ""}
              onValueChange={(v) => {
                setEnergyRating(parseInt(v));
                setEnergyOverride(true);
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select energy" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} {n <= 3 ? "😴" : n <= 6 ? "😐" : "⚡"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {energyRating && !energyOverride && (
              <p className="text-xs text-purple-600 mt-1">AI suggested</p>
            )}
          </div>
        </div>
      </div>

      {/* Passphrase Dialog */}
      <Dialog open={showPassphraseDialog} onOpenChange={setShowPassphraseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {isNewEncryption ? "Set Up Encryption" : "Enter Passphrase"}
            </DialogTitle>
            <DialogDescription>
              {isNewEncryption
                ? "Create a passphrase to encrypt your journal entries. This keeps your thoughts private."
                : "Enter your passphrase to decrypt this journal entry."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={isNewEncryption ? "Create passphrase (8+ chars)" : "Enter passphrase"}
              onKeyDown={(e) => e.key === "Enter" && handlePassphraseSubmit()}
            />
            {passphraseError && (
              <p className="text-sm text-red-600">{passphraseError}</p>
            )}
            <div className="flex gap-2">
              <Button onClick={handlePassphraseSubmit} className="flex-1">
                {isNewEncryption ? "Set Passphrase" : "Unlock"}
              </Button>
              {!isNewEncryption && (
                <Button
                  variant="outline"
                  onClick={() => setShowPassphraseDialog(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
