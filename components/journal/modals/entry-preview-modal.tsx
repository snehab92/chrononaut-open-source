"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, ExternalLink, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  decryptJournalEntry,
  isEncryptionInitialized,
  verifyPassphrase,
} from "@/lib/journal/encryption";
import { MOOD_CONFIG, type MoodLabel, type JournalEntry } from "@/lib/journal/types";

interface EntryPreviewModalProps {
  entry: JournalEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EntryPreviewModal({ entry, isOpen, onClose }: EntryPreviewModalProps) {
  const router = useRouter();
  const [decryptedContent, setDecryptedContent] = useState<{
    happened: string;
    feelings: string;
    grateful: string;
  } | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseError, setPassphraseError] = useState("");

  // Attempt to decrypt content when entry changes
  useEffect(() => {
    if (!entry || !isOpen) {
      setDecryptedContent(null);
      setNeedsPassphrase(false);
      setPassphrase("");
      setPassphraseError("");
      return;
    }

    const hasEncryptedContent =
      entry.encrypted_happened ||
      entry.encrypted_feelings ||
      entry.encrypted_grateful;

    if (!hasEncryptedContent) {
      setDecryptedContent({ happened: "", feelings: "", grateful: "" });
      return;
    }

    // Check if encryption is initialized
    if (!isEncryptionInitialized()) {
      setNeedsPassphrase(true);
      return;
    }

    // Try to decrypt
    attemptDecrypt();
  }, [entry, isOpen]);

  const attemptDecrypt = async () => {
    if (!entry) return;

    setIsDecrypting(true);
    try {
      const decrypted = await decryptJournalEntry({
        encrypted_happened: entry.encrypted_happened,
        encrypted_feelings: entry.encrypted_feelings,
        encrypted_grateful: entry.encrypted_grateful,
      });
      setDecryptedContent(decrypted);
      setNeedsPassphrase(false);
    } catch {
      setNeedsPassphrase(true);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handlePassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassphraseError("");

    const isValid = await verifyPassphrase(passphrase);
    if (!isValid) {
      setPassphraseError("Incorrect passphrase");
      return;
    }

    await attemptDecrypt();
    setPassphrase("");
  };

  const navigateToEntry = () => {
    if (entry) {
      router.push(`/journal?date=${entry.entry_date}`);
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!entry) return null;

  const moodConfig = entry.mood_label ? MOOD_CONFIG[entry.mood_label as MoodLabel] : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-[#FAF8F5]">
        {/* Photo Header */}
        {entry.photo_url && (
          <div className="relative w-full aspect-video">
            <img
              src={entry.photo_url}
              alt={`Journal photo from ${entry.entry_date}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          <DialogHeader className="mb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-[#1E3D32] font-serif">
                <Calendar className="w-4 h-4 text-[#5C7A6B]" />
                {formatDate(entry.entry_date)}
              </DialogTitle>
              {moodConfig && (
                <span
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-sm",
                    moodConfig.bgColor,
                    moodConfig.color
                  )}
                >
                  <span>{moodConfig.emoji}</span>
                  <span className="text-xs">{entry.mood_label}</span>
                </span>
              )}
            </div>

            {/* Location */}
            {entry.location_name && (
              <div className="flex items-center gap-1.5 text-sm text-[#5C7A6B] mt-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>{entry.location_name}</span>
              </div>
            )}
          </DialogHeader>

          {/* Passphrase Input */}
          {needsPassphrase && (
            <div className="mb-4 p-4 bg-white rounded-lg border border-[#E8DCC4]">
              <div className="flex items-center gap-2 mb-3 text-[#5C7A6B]">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Entry is encrypted</span>
              </div>
              <form onSubmit={handlePassphraseSubmit} className="space-y-3">
                <Input
                  type="password"
                  placeholder="Enter your passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="bg-[#FAF8F5]"
                />
                {passphraseError && (
                  <p className="text-sm text-red-600">{passphraseError}</p>
                )}
                <Button type="submit" size="sm" className="w-full">
                  Unlock
                </Button>
              </form>
            </div>
          )}

          {/* Decrypted Content */}
          {isDecrypting && (
            <div className="text-center py-4 text-[#8B9A8F]">
              Decrypting...
            </div>
          )}

          {decryptedContent && !needsPassphrase && (
            <div className="space-y-3">
              {decryptedContent.happened && (
                <div>
                  <h4 className="text-xs font-medium text-[#8B9A8F] uppercase tracking-wide mb-1">
                    What happened
                  </h4>
                  <p className="text-sm text-[#1E3D32] line-clamp-3">
                    {decryptedContent.happened}
                  </p>
                </div>
              )}
              {decryptedContent.feelings && (
                <div>
                  <h4 className="text-xs font-medium text-[#8B9A8F] uppercase tracking-wide mb-1">
                    How I felt
                  </h4>
                  <p className="text-sm text-[#1E3D32] line-clamp-3">
                    {decryptedContent.feelings}
                  </p>
                </div>
              )}
              {decryptedContent.grateful && (
                <div>
                  <h4 className="text-xs font-medium text-[#8B9A8F] uppercase tracking-wide mb-1">
                    Grateful for
                  </h4>
                  <p className="text-sm text-[#1E3D32] line-clamp-3">
                    {decryptedContent.grateful}
                  </p>
                </div>
              )}

              {/* Empty state if no content */}
              {!decryptedContent.happened &&
                !decryptedContent.feelings &&
                !decryptedContent.grateful && (
                  <p className="text-sm text-[#8B9A8F] italic">
                    No written content for this day.
                  </p>
                )}
            </div>
          )}

          {/* View Full Entry Button */}
          <div className="mt-5 pt-4 border-t border-[#E8DCC4]">
            <Button
              onClick={navigateToEntry}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Full Entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
