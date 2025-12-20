"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  X, Send, Loader2, MessageSquare, Sparkles, 
  BookmarkPlus, FileText, CheckSquare, MoreHorizontal,
  ChevronLeft, Star, Trash2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  savedToMemory?: boolean;
  pushedToNoteId?: string;
  createdTaskId?: string;
}

interface Conversation {
  id: string;
  title: string;
  context_type: string | null;
  agent_type: string | null;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    type: "general" | "focus" | "journal" | "meeting" | "task";
    id?: string;
    title?: string;
  };
}

type ViewMode = "chat" | "history";

export function ChatDrawer({ isOpen, onClose, context }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && viewMode === "chat") {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, viewMode]);

  // Handle keyboard shortcut to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (viewMode === "history") {
          setViewMode("chat");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, viewMode, onClose]);

  // Fetch conversation history
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/ai/chat/history");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback(async (convId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai/chat/history?conversationId=${convId}`);
      if (response.ok) {
        const data = await response.json();
        setConversationId(convId);
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: new Date(m.created_at),
          savedToMemory: m.saved_to_memory,
          pushedToNoteId: m.pushed_to_note_id,
          createdTaskId: m.created_task_id,
        })));
        setViewMode("chat");
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch("/api/ai/chat/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId }),
      });
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== convId));
        if (conversationId === convId) {
          startNewConversation();
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          context,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: data.messageId || crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        createdAt: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, conversationId, context, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSaveToMemory = async (messageId: string) => {
    try {
      await fetch("/api/ai/chat/save-to-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, conversationId }),
      });
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, savedToMemory: true } : m
      ));
    } catch (error) {
      console.error("Failed to save to memory:", error);
    }
  };

  const handlePushToNote = async (messageId: string, content: string) => {
    try {
      const response = await fetch("/api/ai/chat/push-to-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messageId, 
          conversationId,
          content,
          title: `AI Insight - ${new Date().toLocaleDateString()}`,
        }),
      });
      
      const data = await response.json();
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, pushedToNoteId: data.noteId } : m
      ));
    } catch (error) {
      console.error("Failed to push to note:", error);
    }
  };

  const handleCreateTask = async (messageId: string, content: string) => {
    try {
      const title = content.split("\n")[0].slice(0, 50) || "Task from AI";
      
      const response = await fetch("/api/ai/chat/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messageId, 
          conversationId,
          title,
          content,
        }),
      });
      
      const data = await response.json();
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, createdTaskId: data.taskId } : m
      ));
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
    setViewMode("chat");
  };

  const openHistory = () => {
    fetchHistory();
    setViewMode("history");
  };

  const getContextLabel = () => {
    if (!context) return "General";
    switch (context.type) {
      case "focus": return `Focus: ${context.title || "Session"}`;
      case "journal": return "Journal Reflection";
      case "meeting": return `Meeting: ${context.title || "Prep"}`;
      case "task": return `Task: ${context.title || "Help"}`;
      default: return "General";
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getContextIcon = (contextType: string | null) => {
    switch (contextType) {
      case "focus": return "🎯";
      case "journal": return "📓";
      case "meeting": return "👥";
      case "task": return "✅";
      default: return "💬";
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50",
        "flex flex-col",
        "transform transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#F5F0E6]">
          <div className="flex items-center gap-2">
            {viewMode === "history" ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode("chat")}
                className="h-8 w-8 p-0 -ml-1"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : (
              <Sparkles className="h-5 w-5 text-[#2D5A47]" />
            )}
            <div>
              <h2 className="font-medium text-[#1E3D32]">
                {viewMode === "history" ? "Conversation History" : "AI Coach"}
              </h2>
              {viewMode === "chat" && (
                <p className="text-xs text-[#5C7A6B]">{getContextLabel()}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {viewMode === "chat" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={startNewConversation}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Conversation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={openHistory}>
                    <Clock className="h-4 w-4 mr-2" />
                    View History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {viewMode === "history" ? (
          /* History View */
          <div className="flex-1 overflow-y-auto">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-[#5C7A6B]" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <MessageSquare className="h-12 w-12 text-[#E8DCC4] mb-4" />
                <h3 className="font-medium text-[#1E3D32] mb-2">No conversations yet</h3>
                <p className="text-sm text-[#5C7A6B]">
                  Start chatting to see your history here.
                </p>
                <Button
                  onClick={() => setViewMode("chat")}
                  className="mt-4 bg-[#2D5A47] hover:bg-[#1E3D32]"
                >
                  Start Chatting
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#E8DCC4]">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={cn(
                      "flex items-start gap-3 p-4 cursor-pointer hover:bg-[#F5F0E6] transition-colors",
                      conversationId === conv.id && "bg-[#F5F0E6]"
                    )}
                  >
                    <span className="text-lg">{getContextIcon(conv.context_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-[#1E3D32] truncate">
                          {conv.title}
                        </p>
                        {conv.is_starred && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-[#8B9A8F] mt-0.5">
                        {formatRelativeTime(conv.last_message_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:text-red-500"
                      onClick={(e) => deleteConversation(conv.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Chat View */
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Sparkles className="h-12 w-12 text-[#E8DCC4] mb-4" />
                  <h3 className="font-medium text-[#1E3D32] mb-2">Hi! I'm your Executive Coach</h3>
                  <p className="text-sm text-[#5C7A6B] mb-4">
                    I'm here to help with focus, planning, emotional regulation, and anything else on your mind.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["Help me prioritize", "I'm feeling stuck", "Meeting prep", "Reflect on my day"].map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setInput(prompt);
                          textareaRef.current?.focus();
                        }}
                        className="px-3 py-1.5 text-xs bg-[#F5F0E6] text-[#5C7A6B] rounded-full hover:bg-[#E8DCC4] transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2",
                      message.role === "user" 
                        ? "bg-[#2D5A47] text-white" 
                        : "bg-[#F5F0E6] text-[#1E3D32]"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Actions for assistant messages */}
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[#E8DCC4]/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-6 px-2 text-xs",
                              message.savedToMemory ? "text-[#2D5A47]" : "text-[#8B9A8F]"
                            )}
                            onClick={() => handleSaveToMemory(message.id)}
                            disabled={message.savedToMemory}
                          >
                            <BookmarkPlus className="h-3 w-3 mr-1" />
                            {message.savedToMemory ? "Saved" : "Memory"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-6 px-2 text-xs",
                              message.pushedToNoteId ? "text-[#2D5A47]" : "text-[#8B9A8F]"
                            )}
                            onClick={() => handlePushToNote(message.id, message.content)}
                            disabled={!!message.pushedToNoteId}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            {message.pushedToNoteId ? "Noted" : "Note"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-6 px-2 text-xs",
                              message.createdTaskId ? "text-[#2D5A47]" : "text-[#8B9A8F]"
                            )}
                            onClick={() => handleCreateTask(message.id, message.content)}
                            disabled={!!message.createdTaskId}
                          >
                            <CheckSquare className="h-3 w-3 mr-1" />
                            {message.createdTaskId ? "Created" : "Task"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#F5F0E6] rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[#5C7A6B]" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="min-h-[44px] max-h-32 resize-none bg-[#F5F0E6] border-0 focus-visible:ring-1 focus-visible:ring-[#2D5A47]"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="h-11 w-11 p-0 bg-[#2D5A47] hover:bg-[#1E3D32]"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-[#8B9A8F] mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
