"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ChatDrawer } from "./chat-drawer";

interface ChatContext {
  type: "general" | "focus" | "journal" | "meeting" | "task";
  id?: string;
  title?: string;
}

interface ChatProviderValue {
  isOpen: boolean;
  openChat: (context?: ChatContext) => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatContext = createContext<ChatProviderValue | null>(null);

export function useChatDrawer() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatDrawer must be used within ChatProvider");
  }
  return context;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<ChatContext | undefined>();

  const openChat = useCallback((ctx?: ChatContext) => {
    setContext(ctx);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

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
    <ChatContext.Provider value={{ isOpen, openChat, closeChat, toggleChat }}>
      {children}
      <ChatDrawer isOpen={isOpen} onClose={closeChat} context={context} />
    </ChatContext.Provider>
  );
}
