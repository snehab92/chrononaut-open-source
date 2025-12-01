"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Check, X, Tag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getLabelColor } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

interface LabelSelectorProps {
  currentLabel: string | null;
  allLabels: string[];
  onSelectLabel: (label: string | null) => void;
  trigger?: React.ReactNode;
  align?: "start" | "center" | "end";
}

export function LabelSelector({
  currentLabel,
  allLabels,
  onSelectLabel,
  trigger,
  align = "start",
}: LabelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when showing
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  const filteredLabels = allLabels.filter((label) =>
    label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelectLabel = (label: string | null) => {
    onSelectLabel(label);
    setIsOpen(false);
    setSearchValue("");
    setShowInput(false);
  };

  const handleCreateLabel = () => {
    if (searchValue.trim()) {
      onSelectLabel(searchValue.trim());
      setSearchValue("");
      setShowInput(false);
      setIsOpen(false);
    }
  };

  const currentLabelColors = currentLabel ? getLabelColor(currentLabel) : null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setSearchValue("");
        setShowInput(false);
      }
    }}>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger || (
          <button
            className={cn(
              "text-xs px-2 py-0.5 rounded transition-colors",
              currentLabel
                ? cn(currentLabelColors?.bg, currentLabelColors?.text)
                : "text-[#8B9A8F] hover:bg-[#F5F0E6]"
            )}
          >
            {currentLabel || "Add label"}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search/Create Input */}
        <div className="px-2 py-1">
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search or create..."
            className="h-6 text-xs"
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && searchValue.trim()) {
                handleCreateLabel();
              }
            }}
          />
        </div>

        <DropdownMenuSeparator />

        {/* Remove label option */}
        {currentLabel && (
          <>
            <DropdownMenuItem
              onClick={() => handleSelectLabel(null)}
              className="text-xs py-1 text-[#8B9A8F]"
            >
              <X className="w-3 h-3 mr-2" />
              Remove label
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Existing labels */}
        <div className="max-h-40 overflow-y-auto">
          {filteredLabels.length > 0 ? (
            filteredLabels.map((label) => {
              const colors = getLabelColor(label);
              const isSelected = label === currentLabel;
              return (
                <DropdownMenuItem
                  key={label}
                  onClick={() => handleSelectLabel(label)}
                  className={cn("text-xs py-1", isSelected && "bg-[#F5F0E6]")}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px]",
                        colors.bg,
                        colors.text
                      )}
                    >
                      {label}
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-[#1E3D32]" />}
                  </div>
                </DropdownMenuItem>
              );
            })
          ) : searchValue ? null : (
            <div className="px-2 py-1.5 text-[10px] text-[#8B9A8F] text-center">
              No labels yet
            </div>
          )}
        </div>

        {/* Create new label */}
        {searchValue && !allLabels.includes(searchValue) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleCreateLabel}
              className="text-xs py-1 text-[#1E3D32]"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              Create "{searchValue}"
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
