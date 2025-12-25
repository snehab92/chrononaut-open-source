"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  FileIcon,
  File,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  importFile,
  detectFormat,
  validateFile,
  getAcceptedFileTypes,
  ImportResult,
} from "@/lib/notes/import";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (result: ImportResult) => void;
  mode: "replace" | "new";
  title?: string;
}

const FORMAT_INFO = {
  md: { icon: FileText, label: "Markdown", color: "text-blue-600" },
  docx: { icon: FileIcon, label: "Word", color: "text-indigo-600" },
  pdf: { icon: File, label: "PDF", color: "text-red-600" },
};

export function ImportDialog({
  open,
  onOpenChange,
  onImport,
  mode,
  title,
}: ImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await importFile(selectedFile);
      onImport(result);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setSelectedFile(null);
      setError(null);
      setIsDragging(false);
    }, 200);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return Upload;
    const format = detectFormat(selectedFile);
    return format ? FORMAT_INFO[format].icon : File;
  };

  const getFormatInfo = () => {
    if (!selectedFile) return null;
    const format = detectFormat(selectedFile);
    return format ? FORMAT_INFO[format] : null;
  };

  const FileIconComponent = getFileIcon();
  const formatInfo = getFormatInfo();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {title || (mode === "replace" ? "Import into Note" : "Import File")}
          </DialogTitle>
          <DialogDescription>
            {mode === "replace"
              ? "The imported content will replace the current note content."
              : "Create a new note from an imported file."}
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center transition-all",
            "min-h-[180px] flex flex-col items-center justify-center",
            !selectedFile && "cursor-pointer",
            isDragging
              ? "border-[#2D5A47] bg-[#F5F0E6]"
              : error
              ? "border-red-300 bg-red-50"
              : selectedFile
              ? "border-[#5C7A6B] bg-[#F5F0E6]"
              : "border-[#E8DCC4] hover:border-[#8B9A8F] hover:bg-[#FAF8F5]"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptedFileTypes()}
            onChange={handleFileSelect}
            className="hidden"
          />

          <FileIconComponent
            className={cn(
              "w-12 h-12 mb-3",
              selectedFile
                ? formatInfo?.color || "text-[#2D5A47]"
                : "text-[#8B9A8F]"
            )}
          />

          {selectedFile ? (
            <div className="text-center">
              <p className="font-medium text-[#1E3D32] mb-1">
                {selectedFile.name}
              </p>
              <p className="text-sm text-[#8B9A8F]">
                {formatInfo?.label} file -{" "}
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="mt-2 text-[#8B9A8F] hover:text-red-600"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[#1E3D32] font-medium mb-1">
                Drop a file here or click to browse
              </p>
              <p className="text-sm text-[#8B9A8F]">
                Supports .md, .docx, and .pdf files
              </p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || isProcessing}
            className="bg-[#2D5A47] hover:bg-[#1E3D32]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
