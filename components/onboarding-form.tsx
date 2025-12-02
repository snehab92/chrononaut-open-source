"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OnboardingFormProps {
  userId: string;
  initialName: string;
}

export function OnboardingForm({ userId, initialName }: OnboardingFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: initialName,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    windDownTime: "18:00",
    maxFocusMinutes: 90,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.fullName,
        timezone: formData.timezone,
        wind_down_time: formData.windDownTime,
        max_focus_minutes: formData.maxFocusMinutes,
        onboarding_completed: true,
      })
      .eq("id", userId);

    if (error) {
      console.error("Onboarding error:", error);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName">Your Name</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          placeholder="How should we call you?"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input
          id="timezone"
          value={formData.timezone}
          onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          disabled
        />
        <p className="text-xs text-muted-foreground">Auto-detected from your browser</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="windDownTime">Wind-Down Reminder Time</Label>
        <Input
          id="windDownTime"
          type="time"
          value={formData.windDownTime}
          onChange={(e) => setFormData({ ...formData, windDownTime: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          We&apos;ll nudge you to wrap up and journal
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxFocusMinutes">Max Focus Session (minutes)</Label>
        <Input
          id="maxFocusMinutes"
          type="number"
          min={15}
          max={180}
          value={formData.maxFocusMinutes}
          onChange={(e) => setFormData({ ...formData, maxFocusMinutes: parseInt(e.target.value) })}
        />
        <p className="text-xs text-muted-foreground">
          We&apos;ll suggest breaks after this duration
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Setting up..." : "Let's Go →"}
      </Button>
    </form>
  );
}
