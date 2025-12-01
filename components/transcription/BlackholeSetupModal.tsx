"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle2, Circle, Headphones } from "lucide-react";

interface BlackholeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const BLACKHOLE_DOWNLOAD_URL = "https://existential.audio/blackhole/";

export function BlackholeSetupModal({
  isOpen,
  onClose,
  onComplete,
}: BlackholeSetupModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Download BlackHole",
      description: "Download the free BlackHole 2ch virtual audio driver for macOS.",
      action: (
        <Button
          variant="outline"
          onClick={() => window.open(BLACKHOLE_DOWNLOAD_URL, "_blank")}
          className="gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Download BlackHole
        </Button>
      ),
    },
    {
      title: "Install BlackHole",
      description:
        "Open the downloaded .pkg file and follow the installation prompts. You may need to grant permission in System Settings > Privacy & Security.",
    },
    {
      title: "Create Multi-Output Device",
      description: (
        <div className="space-y-2 text-sm">
          <p>Open <strong>Audio MIDI Setup</strong> (search in Spotlight):</p>
          <ol className="list-decimal list-inside space-y-1 text-[#8B9A8F]">
            <li>Click the + button → Create Multi-Output Device</li>
            <li>Check both your speakers/headphones AND BlackHole 2ch</li>
            <li>Make sure your speakers/headphones is the Master Device</li>
          </ol>
        </div>
      ),
    },
    {
      title: "Set as Output",
      description: (
        <div className="space-y-2 text-sm">
          <p>In <strong>System Settings → Sound → Output</strong>:</p>
          <p className="text-[#8B9A8F]">
            Select the Multi-Output Device you just created. This routes audio to both
            your speakers AND BlackHole for transcription.
          </p>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-[#5C7A6B]" />
            System Audio Setup
          </DialogTitle>
          <DialogDescription>
            One-time setup to capture meeting audio from any application.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicators */}
        <div className="flex items-center justify-center gap-2 py-4">
          {steps.map((_, index) => (
            <div key={index} className="flex items-center">
              {index < currentStep ? (
                <CheckCircle2 className="w-6 h-6 text-[#2D5A47]" />
              ) : index === currentStep ? (
                <div className="w-6 h-6 rounded-full bg-[#2D5A47] flex items-center justify-center text-white text-xs font-medium">
                  {index + 1}
                </div>
              ) : (
                <Circle className="w-6 h-6 text-[#E8DCC4]" />
              )}
              {index < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    index < currentStep ? "bg-[#2D5A47]" : "bg-[#E8DCC4]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Current step content */}
        <div className="py-4">
          <h3 className="font-medium text-[#1E3D32] mb-2">
            {steps[currentStep].title}
          </h3>
          <div className="text-[#5C7A6B]">
            {typeof steps[currentStep].description === "string" ? (
              <p>{steps[currentStep].description}</p>
            ) : (
              steps[currentStep].description
            )}
          </div>
          {steps[currentStep].action && (
            <div className="mt-4">{steps[currentStep].action}</div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              className="bg-[#2D5A47] hover:bg-[#1E3D32]"
            >
              {currentStep === steps.length - 1 ? "Done" : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
