"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { FocusCue, SessionMetrics } from "@/lib/focus/cue-types";
import { evaluateCues, resetCueTracking } from "@/lib/focus/cue-engine";

interface UseFocusCuesOptions {
  enabled: boolean;
  isFocusing: boolean;
  focusTimeSeconds: number;
  taskTimeSeconds: number;
  taskTitle: string | null;
  focusMode: string;
  onTakeBreak?: () => void;
  onCompleteTask?: () => void;
  onSwitchTask?: () => void;
}

interface UseFocusCuesReturn {
  currentCue: FocusCue | null;
  dismissCue: () => void;
  snoozeCue: (minutes?: number) => void;
  metrics: SessionMetrics;
}

export function useFocusCues(options: UseFocusCuesOptions): UseFocusCuesReturn {
  const {
    enabled,
    isFocusing,
    focusTimeSeconds,
    taskTimeSeconds,
    taskTitle,
    focusMode,
    onTakeBreak,
    onCompleteTask,
    onSwitchTask,
  } = options;

  const supabase = createClient();

  // Cue state
  const [currentCue, setCurrentCue] = useState<FocusCue | null>(null);
  const [snoozedUntil, setSnoozedUntil] = useState<Date | null>(null);

  // Session metrics
  const [metrics, setMetrics] = useState<SessionMetrics>({
    focusTimeSeconds: 0,
    taskTimeSeconds: 0,
    tabSwitchCount: 0,
    lastTabSwitchAt: null,
    isWindowFocused: true,
    sessionStartedAt: new Date(),
    lastCueFiredAt: null,
    lastCueType: null,
    cuesDismissedCount: 0,
    cuesSnoozedCount: 0,
    taskTitle: null,
    focusMode: "writing",
  });

  // Refs for tracking
  const wasWindowFocused = useRef(true);
  const evaluationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update metrics when props change
  useEffect(() => {
    setMetrics((prev) => ({
      ...prev,
      focusTimeSeconds,
      taskTimeSeconds,
      taskTitle,
      focusMode,
    }));
  }, [focusTimeSeconds, taskTimeSeconds, taskTitle, focusMode]);

  // Track window focus/blur (tab switching detection)
  useEffect(() => {
    if (!isFocusing) return;

    const handleVisibilityChange = () => {
      const isNowFocused = !document.hidden;

      if (!isNowFocused && wasWindowFocused.current) {
        // User switched away
        setMetrics((prev) => ({
          ...prev,
          isWindowFocused: false,
          lastTabSwitchAt: new Date(),
          tabSwitchCount: prev.tabSwitchCount + 1,
        }));
      } else if (isNowFocused && !wasWindowFocused.current) {
        // User switched back
        setMetrics((prev) => ({
          ...prev,
          isWindowFocused: true,
        }));
      }

      wasWindowFocused.current = isNowFocused;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isFocusing]);

  // Reset metrics when session starts
  useEffect(() => {
    if (isFocusing) {
      setMetrics({
        focusTimeSeconds: 0,
        taskTimeSeconds: 0,
        tabSwitchCount: 0,
        lastTabSwitchAt: null,
        isWindowFocused: true,
        sessionStartedAt: new Date(),
        lastCueFiredAt: null,
        lastCueType: null,
        cuesDismissedCount: 0,
        cuesSnoozedCount: 0,
        taskTitle,
        focusMode,
      });
      resetCueTracking();
      setCurrentCue(null);
      setSnoozedUntil(null);
    }
  }, [isFocusing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cue evaluation loop
  useEffect(() => {
    if (!enabled || !isFocusing) {
      if (evaluationIntervalRef.current) {
        clearInterval(evaluationIntervalRef.current);
        evaluationIntervalRef.current = null;
      }
      return;
    }

    // Evaluate cues every 30 seconds
    const evaluate = () => {
      // Don't evaluate if there's already a cue showing
      if (currentCue) return;

      // Don't evaluate if snoozed
      if (snoozedUntil && new Date() < snoozedUntil) return;

      const cue = evaluateCues(metrics);

      if (cue) {
        setCurrentCue(cue);
        setMetrics((prev) => ({
          ...prev,
          lastCueFiredAt: new Date(),
          lastCueType: cue.type,
        }));

        // Log cue instance to database
        logCueInstance(cue);
      }
    };

    // Initial evaluation after short delay
    const initialTimeout = setTimeout(evaluate, 5000);

    // Regular evaluation interval
    evaluationIntervalRef.current = setInterval(evaluate, 30000);

    return () => {
      clearTimeout(initialTimeout);
      if (evaluationIntervalRef.current) {
        clearInterval(evaluationIntervalRef.current);
      }
    };
  }, [enabled, isFocusing, currentCue, snoozedUntil, metrics]);

  // Log cue instance to database
  const logCueInstance = async (cue: FocusCue) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // First, ensure we have or create a cue rule for this type
      const { data: existingRule } = await supabase
        .from("cue_rules")
        .select("id")
        .eq("user_id", user.id)
        .eq("cue_type", cue.type)
        .single();

      let ruleId = existingRule?.id;

      if (!ruleId) {
        const { data: newRule } = await supabase
          .from("cue_rules")
          .insert({
            user_id: user.id,
            cue_type: cue.type,
            enabled: true,
            message_template: cue.message,
          })
          .select("id")
          .single();
        ruleId = newRule?.id;
      }

      if (ruleId) {
        await supabase.from("cue_instances").insert({
          user_id: user.id,
          cue_rule_id: ruleId,
          context: {
            focusMinutes: Math.floor(metrics.focusTimeSeconds / 60),
            taskMinutes: Math.floor(metrics.taskTimeSeconds / 60),
            tabSwitchCount: metrics.tabSwitchCount,
            focusMode: metrics.focusMode,
            taskTitle: metrics.taskTitle,
            ...cue.contextData,
          },
        });
      }
    } catch (error) {
      console.error("Failed to log cue instance:", error);
    }
  };

  // Handle cue actions
  const dismissCue = useCallback(() => {
    if (currentCue) {
      setMetrics((prev) => ({
        ...prev,
        cuesDismissedCount: prev.cuesDismissedCount + 1,
      }));

      // Update cue instance as acknowledged
      updateCueResponse(currentCue.id, "dismissed");
    }
    setCurrentCue(null);
  }, [currentCue]);

  const snoozeCue = useCallback(
    (minutes?: number) => {
      const snoozeMinutes = minutes || currentCue?.snoozeMinutes || 10;
      const until = new Date(Date.now() + snoozeMinutes * 60 * 1000);

      setSnoozedUntil(until);
      setMetrics((prev) => ({
        ...prev,
        cuesSnoozedCount: prev.cuesSnoozedCount + 1,
      }));

      if (currentCue) {
        updateCueResponse(currentCue.id, "snoozed", snoozeMinutes);
      }
      setCurrentCue(null);
    },
    [currentCue]
  );

  // Update cue response in database
  const updateCueResponse = async (
    cueId: string,
    action: string,
    snoozeMinutes?: number
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get the most recent cue instance
      const { data: instances } = await supabase
        .from("cue_instances")
        .select("id")
        .eq("user_id", user.id)
        .order("fired_at", { ascending: false })
        .limit(1);

      if (instances?.[0]) {
        await supabase
          .from("cue_instances")
          .update({
            acknowledged: true,
            acknowledged_at: new Date().toISOString(),
            action_taken: action,
          })
          .eq("id", instances[0].id);
      }
    } catch (error) {
      console.error("Failed to update cue response:", error);
    }
  };

  // Handle cue action callbacks
  const handleCueAction = useCallback(
    (action: string) => {
      switch (action) {
        case "dismiss":
          dismissCue();
          break;
        case "snooze":
          snoozeCue();
          break;
        case "take_break":
          dismissCue();
          onTakeBreak?.();
          break;
        case "complete_task":
          dismissCue();
          onCompleteTask?.();
          break;
        case "switch_task":
          dismissCue();
          onSwitchTask?.();
          break;
        default:
          dismissCue();
      }
    },
    [dismissCue, snoozeCue, onTakeBreak, onCompleteTask, onSwitchTask]
  );

  return {
    currentCue,
    dismissCue,
    snoozeCue,
    metrics,
  };
}
