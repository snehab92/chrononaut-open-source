"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger with Cmd (Mac) or Ctrl (Windows)
      if (!(e.metaKey || e.ctrlKey)) return;

      switch (e.key.toLowerCase()) {
        case "d":
          e.preventDefault();
          router.push("/dashboard");
          break;
        case "n":
          e.preventDefault();
          router.push("/notes");
          break;
        case "f":
          e.preventDefault();
          router.push("/focus");
          break;
        case "j":
          e.preventDefault();
          router.push("/journal");
          break;
        // Note: ⌘T (Quick Task) is handled by QuickTaskProvider
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
