"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, Component, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChatDrawer } from "../chat-drawer";
import { AgentType } from "@/lib/ai/agents";

// Error boundary to prevent chat drawer crashes from taking down the whole app
class ChatErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ChatDrawer] Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Silently hide the broken drawer rather than crashing the app
    }
    return this.props.children;
  }
}

interface FocusContextData {
  focusMode?: string;
  focusModeLabel?: string;
  currentTask?: string;
  sessionDuration?: string;
}

interface ChatContextType {
  type: "general" | "focus" | "journal" | "meeting" | "task" | "notes" | "dashboard";
  id?: string;
  title?: string;
  context?: FocusContextData;
}

interface ChatProviderValue {
  isOpen: boolean;
  isMinimized: boolean;
  openChat: (context?: ChatContextType) => void;
  closeChat: () => void;
  toggleChat: () => void;
  minimizeChat: () => void;
  restoreChat: () => void;
  currentContextType: string;
  defaultAgent: AgentType;
}

const ChatContext = createContext<ChatProviderValue | null>(null);

export function useChatDrawer() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatDrawer must be used within ChatProvider");
  }
  return context;
}

// Detect context type from pathname
function getContextFromPath(pathname: string): ChatContextType["type"] {
  if (pathname.includes("/notes")) return "notes";
  if (pathname.includes("/journal")) return "journal";
  if (pathname.includes("/focus")) return "focus";
  if (pathname.includes("/meeting")) return "meeting";
  if (pathname.includes("/dashboard") || pathname === "/") return "dashboard";
  return "general";
}

// Get default agent for context - maps screens to appropriate agents
function getDefaultAgentForContext(contextType: string): AgentType {
  const mapping: Record<string, AgentType> = {
    dashboard: "research-assistant",
    notes: "executive-coach",
    focus: "executive-coach",
    journal: "executive-coach",
    meeting: "executive-coach",
    task: "executive-coach",
    general: "research-assistant",
  };
  return mapping[contextType] || "executive-coach";
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [context, setContext] = useState<ChatContextType | undefined>();
  const prevPathnameRef = useRef(pathname);
  const wasOpenBeforeMinimize = useRef(false);

  // Get current context type from pathname
  const currentContextType = getContextFromPath(pathname);
  const defaultAgent = getDefaultAgentForContext(currentContextType);

  // Auto-minimize when screen changes AND drawer is open
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      // Screen changed
      if (isOpen) {
        // Was open - minimize it
        wasOpenBeforeMinimize.current = true;
        setIsMinimized(true);
        setIsOpen(false);
      }
      prevPathnameRef.current = pathname;
    }
  }, [pathname, isOpen]);

  const openChat = useCallback((ctx?: ChatContextType) => {
    setContext(ctx);
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    wasOpenBeforeMinimize.current = false;
  }, []);

  const minimizeChat = useCallback(() => {
    wasOpenBeforeMinimize.current = isOpen;
    setIsOpen(false);
    setIsMinimized(true);
  }, [isOpen]);

  const restoreChat = useCallback(() => {
    setIsMinimized(false);
    setIsOpen(true);
  }, []);

  const toggleChat = useCallback(() => {
    if (isMinimized) {
      restoreChat();
    } else if (isOpen) {
      minimizeChat();
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isOpen, isMinimized, restoreChat, minimizeChat]);

  // Global keyboard shortcut: Cmd+/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        toggleChat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleChat]);

  return (
    <ChatContext.Provider value={{ 
      isOpen, 
      isMinimized, 
      openChat, 
      closeChat, 
      toggleChat,
      minimizeChat,
      restoreChat,
      currentContextType,
      defaultAgent,
    }}>
      {children}
      <ChatErrorBoundary>
        <ChatDrawer
          isOpen={isOpen}
          onClose={closeChat}
          onMinimize={minimizeChat}
          contextType={context?.type || currentContextType}
          contextId={context?.id}
          defaultAgentOverride={defaultAgent}
          focusContext={context?.context}
        />
      </ChatErrorBoundary>
      {/* Floating chat button - always visible when minimized or closed */}
      {(!isOpen || isMinimized) && (
        <button
          onClick={restoreChat}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 bg-[#2D5A47] hover:bg-[#1E3D32]"
          title="Open AI Chat (⌘/)"
        >
          <span className="text-2xl">🧭</span>
        </button>
      )}
    </ChatContext.Provider>
  );
}
