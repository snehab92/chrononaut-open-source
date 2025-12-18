"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  X, Send, MessageSquare, Copy, Check,
  History, Plus, Trash2, ClipboardPaste, Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AGENTS, AgentType, CONTEXT_DEFAULT_AGENTS } from "@/lib/ai/agents";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contextType?: string;
  contextId?: string;
  contextContent?: string;
  onInsertToNote?: (content: string) => void;
}

interface Conversation {
  id: string;
  title: string;
  agent_type: AgentType;
  created_at: string;
  updated_at: string;
}

// Cache for persisting chats per agent
const agentChatCache: Record<string, {
  conversationId: string;
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
}> = {};

export function ChatDrawer({ 
  isOpen, 
  onClose, 
  contextType = "general",
  contextId,
  contextContent,
  onInsertToNote 
}: ChatDrawerProps) {
  const [agentType, setAgentType] = useState<AgentType>(
    CONTEXT_DEFAULT_AGENTS[contextType] || "executive-coach"
  );
  const [conversationId, setConversationId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  const agent = AGENTS[agentType];

  // Initialize on client only to avoid hydration mismatch
  useEffect(() => {
    if (!isHydrated) {
      const cached = agentChatCache[agentType];
      if (cached) {
        setConversationId(cached.conversationId);
        setMessages(cached.messages);
      } else {
        setConversationId(crypto.randomUUID());
      }
      setIsHydrated(true);
    }
  }, [isHydrated, agentType]);

  // Save current chat to cache when messages change
  useEffect(() => {
    if (messages.length > 0) {
      agentChatCache[agentType] = {
        conversationId,
        messages,
      };
    }
  }, [messages, conversationId, agentType]);

  // Switch agents - restore from cache or start fresh
  const handleAgentChange = (newAgent: AgentType) => {
    // Save current state to cache
    if (messages.length > 0) {
      agentChatCache[agentType] = { conversationId, messages };
    }
    
    // Switch to new agent
    setAgentType(newAgent);
    
    // Restore from cache or start fresh
    if (agentChatCache[newAgent]) {
      setConversationId(agentChatCache[newAgent].conversationId);
      setMessages(agentChatCache[newAgent].messages);
    } else {
      setConversationId(crypto.randomUUID());
      setMessages([]);
    }
    setInputValue("");
  };

  // Update default agent when context changes
  useEffect(() => {
    const defaultAgent = CONTEXT_DEFAULT_AGENTS[contextType] || "executive-coach";
    if (defaultAgent !== agentType && messages.length === 0) {
      handleAgentChange(defaultAgent);
    }
  }, [contextType]);

  // Send message and stream response
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: inputValue.trim(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          agentType,
          conversationId,
          context: contextContent,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to send message");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: "",
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage.content += chunk;
          setMessages(prev => 
            prev.map(m => m.id === assistantMessage.id ? { ...m, content: assistantMessage.content } : m)
          );
        }
      }
      
      // Save to DB
      await supabase.from("ai_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: assistantMessage.content,
      });
      
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load conversation history (filtered by agent)
  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, agent_type, created_at, updated_at")
      .eq("agent_type", agentType)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (data) {
      setConversations(data as Conversation[]);
    }
  }, [supabase, agentType]);

  // Reload conversations when agent changes or modal opens
  useEffect(() => {
    if (showHistoryModal) {
      loadConversations();
    }
  }, [showHistoryModal, agentType, loadConversations]);

  // Load a specific conversation
  const loadConversation = async (conv: Conversation) => {
    const { data: messagesData } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (messagesData) {
      const loadedMessages = messagesData.map((m, i) => ({
        id: `${conv.id}-${i}`,
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      setMessages(loadedMessages);
      setConversationId(conv.id);
      
      // Update cache
      agentChatCache[agentType] = {
        conversationId: conv.id,
        messages: loadedMessages,
      };
      
      setShowHistoryModal(false);
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    const newId = crypto.randomUUID();
    setMessages([]);
    setConversationId(newId);
    
    // Clear cache for this agent
    delete agentChatCache[agentType];
    
    setShowHistoryModal(false);
  };

  // Delete conversation
  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("ai_conversations").delete().eq("id", convId);
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (convId === conversationId) {
      startNewConversation();
    }
  };

  // Rename conversation
  const renameConversation = async (convId: string) => {
    if (!editTitleValue.trim()) return;
    
    await supabase
      .from("ai_conversations")
      .update({ title: editTitleValue.trim() })
      .eq("id", convId);
    
    setConversations(prev => 
      prev.map(c => c.id === convId ? { ...c, title: editTitleValue.trim() } : c)
    );
    setEditingTitle(null);
    setEditTitleValue("");
  };

  // Copy message to clipboard
  const copyToClipboard = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
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
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#E8DCC4] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{agent.icon}</span>
            <Select
              value={agentType}
              onValueChange={(value: AgentType) => handleAgentChange(value)}
            >
              <SelectTrigger className="w-40 border-none bg-transparent font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AGENTS)
                  .filter(a => a.id !== "pattern-analyst")
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.icon} {a.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="h-8 w-8 p-0"
              title="Recent conversations"
            >
              <History className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewConversation}
              className="h-8 w-8 p-0"
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#8B9A8F]">
              <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-center">{agent.description}</p>
              <p className="text-sm mt-2">Start a conversation...</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col",
                  message.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2 group relative",
                    message.role === "user"
                      ? "bg-[#2D5A47] text-white"
                      : "bg-[#F5F0E6] text-[#1E3D32]"
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  
                  {message.role === "assistant" && (
                    <div className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="h-6 px-2 text-xs text-[#8B9A8F]"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3 h-3 mr-1" />
                        ) : (
                          <Copy className="w-3 h-3 mr-1" />
                        )}
                        Copy
                      </Button>
                      {onInsertToNote && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onInsertToNote(message.content)}
                          className="h-6 px-2 text-xs text-[#8B9A8F]"
                        >
                          <ClipboardPaste className="w-3 h-3 mr-1" />
                          Insert
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex items-start">
              <div className="bg-[#F5F0E6] rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#8B9A8F] rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-[#8B9A8F] rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-[#8B9A8F] rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#E8DCC4] bg-[#FAF8F5]">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${agent.name}...`}
              className="min-h-[44px] max-h-32 resize-none bg-white border-[#E8DCC4] focus:border-[#2D5A47]"
              rows={1}
            />
            <Button
              type="button"
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-[#2D5A47] hover:bg-[#1E3D32] text-white h-11 w-11 p-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-[#8B9A8F] mt-2 text-center">
            ⌘/ to toggle • Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {agent.icon} {agent.name} Conversations
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {conversations.length === 0 ? (
              <p className="text-center text-[#8B9A8F] py-8">
                No conversations yet with {agent.name}
              </p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv)}
                    className={cn(
                      "px-3 py-3 rounded-lg cursor-pointer group",
                      conv.id === conversationId
                        ? "bg-[#E8DCC4]"
                        : "hover:bg-[#F5F0E6]"
                    )}
                  >
                    {editingTitle === conv.id ? (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameConversation(conv.id);
                            if (e.key === "Escape") setEditingTitle(null);
                          }}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => renameConversation(conv.id)}
                          className="h-8"
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1E3D32] truncate">
                            {conv.title || "Untitled conversation"}
                          </p>
                          <p className="text-xs text-[#8B9A8F] mt-0.5">
                            {formatDate(conv.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitle(conv.id);
                              setEditTitleValue(conv.title || "");
                            }}
                            className="h-7 w-7 p-0"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => deleteConversation(conv.id, e)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t">
            <Button
              onClick={startNewConversation}
              className="w-full bg-[#2D5A47] hover:bg-[#1E3D32]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Conversation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
