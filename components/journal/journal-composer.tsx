"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar,
  MapPin,
  Image as ImageIcon,
  Sparkles,
  Save,
  Loader2,
  X,
  ChevronDown,
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
import { parseExifFromFile, reverseGeocode, ExifData } from "@/lib/journal/exif-parser";
import { LabelMultiSelect } from "@/components/shared/label-multi-select";

// Mood options grouped by cluster with unified background colors
const MOOD_OPTIONS = [
  // Positive moods - light airy green background
  { value: "Creative", emoji: "✨", color: "bg-[#E8F2EB] text-[#4B7B5A]" },
  { value: "Adventurous", emoji: "🤩", color: "bg-[#E8F2EB] text-[#4B7B5A]" },
  { value: "Socially Connected", emoji: "🥰", color: "bg-[#E8F2EB] text-[#4B7B5A]" },
  { value: "Romantic", emoji: "💕", color: "bg-[#E8F2EB] text-[#4B7B5A]" },
  { value: "Manic", emoji: "🤪", color: "bg-[#E8F2EB] text-[#4B7B5A]" },
  // Neutral/Calm moods - soft golden/yellow background
  { value: "Calm", emoji: "😌", color: "bg-[#FDF6E3] text-[#8B7B4B]" },
  { value: "Content", emoji: "😊", color: "bg-[#FDF6E3] text-[#8B7B4B]" },
  // Negative moods - soft pink/rose background
  { value: "Stressed", emoji: "😣", color: "bg-[#F8E8E8] text-[#8B5A5A]" },
  { value: "Unfocused", emoji: "😶‍🌫️", color: "bg-[#F8E8E8] text-[#8B5A5A]" },
  { value: "Threatened", emoji: "😰", color: "bg-[#F8E8E8] text-[#8B5A5A]" },
  { value: "Rejected", emoji: "😢", color: "bg-[#F8E8E8] text-[#8B5A5A]" },
  { value: "Angry", emoji: "😠", color: "bg-[#F8E8E8] text-[#8B5A5A]" },
];

interface JournalEntry {
  id?: string;
  entry_date: string;
  happened?: string | null;
  feelings?: string | null;
  grateful?: string | null;
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

  // Tag suggestions from previous entries
  const [allTags, setAllTags] = useState<string[]>([]);

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

        // Load plaintext content
        setHappened(data.entry.happened || "");
        setFeelings(data.entry.feelings || "");
        setGrateful(data.entry.grateful || "");
      } else {
        // New entry - reset ALL fields
        setEntry({ entry_date: date });
        setHappened("");
        setFeelings("");
        setGrateful("");
        setLocationName("");
        setLocationLat(null);
        setLocationLng(null);
        setPhotoUrl(null);
        setTags([]);
        setMoodLabel(null);
        setMoodOverride(false);
        setEnergyRating(null);
        setEnergyOverride(false);
      }
    } catch (error) {
      console.error("Failed to load entry:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save entry
  const saveEntry = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_date: date,
          happened: happened || null,
          feelings: feelings || null,
          grateful: grateful || null,
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
          Labels
        </label>
        <LabelMultiSelect
          selectedLabels={tags}
          allLabels={allTags}
          onLabelsChange={setTags}
          placeholder="Add labels..."
        />
      </div>

      {/* Mood Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-[#1E3D32]">Mood</h3>
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
    </div>
  );
}
