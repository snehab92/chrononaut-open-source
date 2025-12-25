"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { X, Check, Plus, ChevronDown, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getLabelColor } from "@/lib/shared/label-colors";
import { cn } from "@/lib/utils";

interface LabelMultiSelectProps {
  /** Currently selected labels */
  selectedLabels: string[];
  /** All available labels for suggestions */
  allLabels: string[];
  /** Callback when labels change */
  onLabelsChange: (labels: string[]) => void;
  /** Placeholder text for empty state */
  placeholder?: string;
  /** Maximum height of dropdown (default: "240px") */
  maxDropdownHeight?: string;
  /** Disable the component */
  disabled?: boolean;
  /** Show compact version (for smaller spaces) */
  compact?: boolean;
}

export function LabelMultiSelect({
  selectedLabels,
  allLabels,
  onLabelsChange,
  placeholder = "Add labels...",
  maxDropdownHeight = "240px",
  disabled = false,
  compact = false,
}: LabelMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure popover is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter labels based on search
  const filteredLabels = useMemo(() => {
    const searchLower = searchValue.toLowerCase().trim();
    if (!searchLower) return allLabels;
    return allLabels.filter((label) =>
      label.toLowerCase().includes(searchLower)
    );
  }, [allLabels, searchValue]);

  // Check if search value is a new label (doesn't exist in allLabels)
  const canCreateNew = useMemo(() => {
    const trimmed = searchValue.trim().toLowerCase();
    if (!trimmed) return false;
    return !allLabels.some((label) => label.toLowerCase() === trimmed);
  }, [searchValue, allLabels]);

  // Toggle a label selection
  const toggleLabel = (label: string) => {
    if (selectedLabels.includes(label)) {
      onLabelsChange(selectedLabels.filter((l) => l !== label));
    } else {
      onLabelsChange([...selectedLabels, label]);
    }
  };

  // Create and add a new label
  const createLabel = () => {
    const newLabel = searchValue.trim().toLowerCase();
    if (newLabel && !selectedLabels.includes(newLabel)) {
      onLabelsChange([...selectedLabels, newLabel]);
      setSearchValue("");
    }
  };

  // Remove a label
  const removeLabel = (label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onLabelsChange(selectedLabels.filter((l) => l !== label));
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchValue.trim()) {
      e.preventDefault();
      if (canCreateNew) {
        createLabel();
      } else if (filteredLabels.length > 0) {
        toggleLabel(filteredLabels[0]);
        setSearchValue("");
      }
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex flex-wrap items-center gap-1.5 w-full min-h-[44px] px-3 py-2",
            "bg-white border border-[#E8DCC4] rounded-lg",
            "text-left text-[16px]", // 16px prevents iOS zoom
            "transition-colors cursor-pointer",
            "hover:border-[#8B9A8F] focus:outline-none focus:ring-2 focus:ring-[#5C7A6B]/20",
            disabled && "opacity-50 cursor-not-allowed",
            compact && "min-h-[36px] py-1.5"
          )}
        >
          {selectedLabels.length === 0 ? (
            <span className="text-[#8B9A8F] flex items-center gap-2">
              <Tag className="w-4 h-4" />
              {placeholder}
            </span>
          ) : (
            <>
              {selectedLabels.map((label) => {
                const color = getLabelColor(label);
                return (
                  <span
                    key={label}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                      "text-sm font-medium border",
                      color.bg,
                      color.text,
                      color.border
                    )}
                  >
                    {label}
                    <button
                      type="button"
                      onClick={(e) => removeLabel(label, e)}
                      className={cn(
                        "rounded-full p-0.5 -mr-0.5",
                        "hover:bg-black/10 transition-colors",
                        "min-w-[20px] min-h-[20px] flex items-center justify-center"
                      )}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 ml-auto text-[#8B9A8F] transition-transform flex-shrink-0",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        {/* Search input */}
        <div className="p-2 border-b border-[#E8DCC4]">
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or create..."
            className="h-10 text-[16px]" // 16px prevents iOS zoom
          />
        </div>

        {/* Label list */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: maxDropdownHeight }}
        >
          {/* Create new option */}
          {canCreateNew && (
            <button
              type="button"
              onClick={createLabel}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2.5",
                "text-left text-[#1E3D32]",
                "hover:bg-[#F5F0E6] transition-colors",
                "min-h-[44px]" // Touch target
              )}
            >
              <Plus className="w-4 h-4 text-[#5C7A6B]" />
              <span>
                Create "<span className="font-medium">{searchValue.trim()}</span>"
              </span>
            </button>
          )}

          {/* Existing labels */}
          {filteredLabels.map((label) => {
            const isSelected = selectedLabels.includes(label);
            const color = getLabelColor(label);

            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleLabel(label)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2.5",
                  "text-left transition-colors",
                  "min-h-[44px]", // Touch target
                  isSelected ? "bg-[#F5F0E6]" : "hover:bg-[#F5F0E6]"
                )}
              >
                {/* Checkbox indicator */}
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                    isSelected
                      ? "bg-[#2D5A47] border-[#2D5A47]"
                      : "border-[#8B9A8F]"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Label badge */}
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-sm font-medium border",
                    color.bg,
                    color.text,
                    color.border
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}

          {/* Empty state */}
          {filteredLabels.length === 0 && !canCreateNew && (
            <div className="px-3 py-4 text-center text-[#8B9A8F] text-sm">
              No labels found. Type to create a new one.
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-[#E8DCC4] text-xs text-[#8B9A8F]">
          Press Enter to add, click X to remove
        </div>
      </PopoverContent>
    </Popover>
  );
}
