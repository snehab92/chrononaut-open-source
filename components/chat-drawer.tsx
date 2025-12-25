"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Send, MessageSquare, Copy, Check,
  History, Plus, Trash2, ClipboardPaste, Pencil, Minus,
  MoreVertical, FileText, Settings, Brain, BookOpen, ArrowLeft
} from "lucide-react";
import { useNoteEditor } from "@/components/notes/note-editor-context";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AGENTS, AgentType } from "@/lib/ai/agents";

// Comprehensive markdown to HTML converter with inline styles
function markdownToHtml(text: string): string {
  let result = text;
  
  result = result.replace(/^### (.+)$/gm, '<h3 style="font-size: 1rem; font-weight: 600; margin: 0.5em 0 0.25em 0;">$1</h3>');
  result = result.replace(/^## (.+)$/gm, '<h2 style="font-size: 1.1rem; font-weight: 600; margin: 0.5em 0 0.25em 0;">$1</h2>');
  result = result.replace(/^# (.+)$/gm, '<h1 style="font-size: 1.2rem; font-weight: 600; margin: 0.5em 0 0.25em 0;">$1</h1>');
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  result = result.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
  result = result.replace(/(?<![\w*])\*([^*]+)\*(?![\w*])/g, '<em>$1</em>');
  result = result.replace(/(?<![\w_])_([^_]+)_(?![\w_])/g, '<em>$1</em>');
  result = result.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.05); padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.9em;">$1</code>');
  result = result.replace(/^[\-\*] (.+)$/gm, '<li style="margin-left: 1em; list-style-type: disc;">$1</li>');
  result = result.replace(/^\d+\. (.+)$/gm, '<li style="margin-left: 1em; list-style-type: decimal;">$1</li>');
  result = result.replace(/\n\n/g, '</p><p style="margin: 0.5em 0;">');
  result = result.replace(/\n/g, '<br/>');
  
  return result;
}

interface FocusContextData {
  focusMode?: string;
  focusModeLabel?: string;
  currentTask?: string;
  sessionDuration?: string;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  contextType?: string;
  contextId?: string;
  contextContent?: string;
  onInsertToNote?: (content: string) => void;
  defaultAgentOverride?: AgentType;
  focusContext?: FocusContextData;
}

interface Conversation {
  id: string;
  title: string;
  agent_type: AgentType;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  lastMessagePreview?: string;
}

interface AgentInstruction {
  id: string;
  agent_type: AgentType;
  instructions: string;
  is_active: boolean;
}

interface AiInsight {
  id: string;
  insight_type: string;
  content: string;
  created_at: string;
  source_type: string;
}

// Cache for persisting chats per agent
const agentChatCache: Record<string, {
  conversationId: string;
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
}> = {};

export function ChatDrawer({ 
  isOpen, 
  onClose,
  onMinimize,
  contextType = "general",
  contextId,
  contextContent,
  onInsertToNote,
  defaultAgentOverride,
  focusContext
}: ChatDrawerProps) {
  // Determine initial agent from override or context
  const getInitialAgent = (): AgentType => {
    if (defaultAgentOverride) return defaultAgentOverride;
    const contextMapping: Record<string, AgentType> = {
      dashboard: "research-assistant",
      notes: "executive-coach",
      focus: "executive-coach",
      meeting: "executive-coach",
      journal: "executive-coach",
      general: "research-assistant",
    };
    return contextMapping[contextType] || "executive-coach";
  };

  const [agentType, setAgentType] = useState<AgentType>(getInitialAgent());
  const [conversationId, setConversationId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [viewMode, setViewMode] = useState<'chat' | 'history'>('chat');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [pastedMessageIds, setPastedMessageIds] = useState<Set<string>>(new Set());
  
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Agent instructions & memory state
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [agentInstructions, setAgentInstructions] = useState<AgentInstruction | null>(null);
  const [instructionsText, setInstructionsText] = useState("");
  const [agentMemories, setAgentMemories] = useState<AiInsight[]>([]);
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();
  const { pasteToActiveEditor, hasActiveEditor, onCreateNoteAndPaste } = useNoteEditor();

  const agent = AGENTS[agentType];

  // Update agent when defaultAgentOverride changes (screen switch)
  useEffect(() => {
    if (defaultAgentOverride && defaultAgentOverride !== agentType) {
      // Save current chat to cache before switching
      if (messages.length > 0) {
        agentChatCache[agentType] = { conversationId, messages };
      }
      
      setAgentType(defaultAgentOverride);
      
      // Restore from cache or start fresh
      if (agentChatCache[defaultAgentOverride]) {
        setConversationId(agentChatCache[defaultAgentOverride].conversationId);
        setMessages(agentChatCache[defaultAgentOverride].messages);
      } else {
        setConversationId(crypto.randomUUID());
        setMessages([]);
      }
    }
  }, [defaultAgentOverride]);

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

  // Load agent instructions when agent changes
  useEffect(() => {
    loadAgentInstructions();
  }, [agentType]);

  const loadAgentInstructions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("agent_instructions")
        .select("*")
        .eq("user_id", user.id)
        .eq("agent_type", agentType)
        .maybeSingle();

      if (error) {
        console.error("[ChatDrawer] Failed to load agent instructions:", error);
        // Don't block the chat if instructions fail to load
        setAgentInstructions(null);
        setInstructionsText("");
        return;
      }

      if (data) {
        setAgentInstructions(data);
        setInstructionsText(data.instructions);
      } else {
        setAgentInstructions(null);
        setInstructionsText("");
      }
    } catch (err) {
      console.error("[ChatDrawer] Error loading agent instructions:", err);
      setAgentInstructions(null);
      setInstructionsText("");
    }
  };

  const saveAgentInstructions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSavingInstructions(true);

    if (agentInstructions) {
      // Update existing
      await supabase
        .from("agent_instructions")
        .update({ instructions: instructionsText })
        .eq("id", agentInstructions.id);
    } else {
      // Create new
      await supabase
        .from("agent_instructions")
        .insert({
          user_id: user.id,
          agent_type: agentType,
          instructions: instructionsText,
          is_active: true,
        });
    }

    await loadAgentInstructions();
    setIsSavingInstructions(false);
    setShowInstructionsModal(false);
  };

  const loadAgentMemories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load AI insights that were sourced from this agent's conversations
    const { data } = await supabase
      .from("ai_insights")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setAgentMemories(data);
    }
  };

  // Switch agents - restore from cache or start fresh
  const handleAgentChange = (newAgent: AgentType) => {
    if (messages.length > 0) {
      agentChatCache[agentType] = { conversationId, messages };
    }
    
    setAgentType(newAgent);
    
    if (agentChatCache[newAgent]) {
      setConversationId(agentChatCache[newAgent].conversationId);
      setMessages(agentChatCache[newAgent].messages);
    } else {
      setConversationId(crypto.randomUUID());
      setMessages([]);
    }
    setInputValue("");
  };

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, agent_type, created_at, updated_at, last_message_at")
      .eq("agent_type", agentType)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (data) {
      // Fetch last message preview for each conversation
      const conversationsWithPreviews = await Promise.all(
        data.map(async (conv) => {
          const { data: lastMessage } = await supabase
            .from("ai_messages")
            .select("content, role")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const preview = lastMessage?.content
            ? lastMessage.content.replace(/\*\*|__|\*|_|`|#/g, '').slice(0, 100) + (lastMessage.content.length > 100 ? "..." : "")
            : "";

          return {
            ...conv,
            lastMessagePreview: preview,
          } as Conversation;
        })
      );
      setConversations(conversationsWithPreviews);
    }
  }, [supabase, agentType]);

  useEffect(() => {
    if (viewMode === 'history') {
      loadConversations();
    }
  }, [viewMode, agentType, loadConversations]);

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

      agentChatCache[agentType] = {
        conversationId: conv.id,
        messages: loadedMessages,
      };

      setViewMode('chat');
    }
  };

  const startNewConversation = () => {
    const newId = crypto.randomUUID();
    setMessages([]);
    setConversationId(newId);
    delete agentChatCache[agentType];
    setViewMode('chat');
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("ai_conversations").delete().eq("id", convId);
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (convId === conversationId) {
      startNewConversation();
    }
  };

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

  const copyToClipboard = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePasteToNote = async (content: string, messageId: string) => {
    // Convert markdown to HTML for the editor
    const htmlContent = `<p>${markdownToHtml(content)}</p>`;

    // Try to paste to active editor
    const success = pasteToActiveEditor(htmlContent);

    if (success) {
      setPastedMessageIds(prev => new Set([...prev, messageId]));
      setTimeout(() => {
        setPastedMessageIds(prev => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }, 2000);
    } else if (onCreateNoteAndPaste) {
      // No active editor - create a new note
      const noteId = await onCreateNoteAndPaste(htmlContent);
      if (noteId) {
        setPastedMessageIds(prev => new Set([...prev, messageId]));
        setTimeout(() => {
          setPastedMessageIds(prev => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
          });
        }, 2000);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#E8DCC4] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <Select
              value={agentType}
              onValueChange={(value: AgentType) => handleAgentChange(value)}
            >
              <SelectTrigger className="w-44 border-none bg-transparent font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AGENTS)
                  .filter(a => a.id !== "pattern-analyst" && a.id !== "therapist")
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span>{a.icon}</span>
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'chat' ? 'history' : 'chat')}
              className="h-8 w-8 p-0"
              title="Recent conversations"
            >
              <History className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={startNewConversation}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setShowInstructionsModal(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Agent Instructions
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => {
                  loadAgentMemories();
                  setShowMemoryModal(true);
                }}>
                  <Brain className="w-4 h-4 mr-2" />
                  Agent Memory
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {onMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMinimize}
                className="h-8 w-8 p-0"
                title="Minimize"
              >
                <Minus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Context indicator */}
        {agentInstructions && agentInstructions.instructions && (
          <div className="px-4 py-2 bg-[#F5F0E6] border-b border-[#E8DCC4] flex items-center gap-2 text-xs text-[#5C7A6B]">
            <BookOpen className="w-3 h-3" />
            <span>Custom instructions active</span>
            <button 
              onClick={() => setShowInstructionsModal(true)}
              className="ml-auto text-[#2D5A47] hover:underline"
            >
              Edit
            </button>
          </div>
        )}

        {viewMode === 'history' ? (
          <>
            {/* History View Header */}
            <div className="px-4 py-3 border-b border-[#E8DCC4] flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('chat')}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium text-[#1E3D32]">{agent.name} History</span>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4">
              {conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#8B9A8F]">
                  <History className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-center">No conversations yet</p>
                  <p className="text-sm mt-2">Start a new chat to see it here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer group border transition-colors",
                        conv.id === conversationId
                          ? "bg-[#E8DCC4] border-[#D4C9B0]"
                          : "bg-white border-[#E8DCC4] hover:bg-[#F5F0E6]"
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
                          <Button size="sm" onClick={() => renameConversation(conv.id)} className="h-8">
                            Save
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-[#1E3D32] line-clamp-1">
                              {conv.title || "Untitled conversation"}
                            </p>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTitle(conv.id);
                                  setEditTitleValue(conv.title || "");
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => deleteConversation(conv.id, e)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {conv.lastMessagePreview && (
                            <p className="text-xs text-[#5C7A6B] mt-1 line-clamp-2">
                              {conv.lastMessagePreview}
                            </p>
                          )}
                          <p className="text-xs text-[#8B9A8F] mt-1.5">
                            {formatDate(conv.last_message_at || conv.updated_at)}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* New Conversation Button */}
            <div className="p-4 border-t border-[#E8DCC4] bg-[#FAF8F5]">
              <Button onClick={startNewConversation} className="w-full bg-[#2D5A47] hover:bg-[#1E3D32]">
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </Button>
            </div>
          </>
        ) : (
          <>
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
                      "flex flex-col mb-8",
                      message.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-4 py-3 group relative",
                        message.role === "user"
                          ? "bg-[#E8DCC4] text-[#1E3D32]"
                          : "bg-[#F5F0E6] text-[#1E3D32]"
                      )}
                    >
                      <div
                        className="text-sm prose prose-sm prose-stone max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:bg-stone-100 [&_code]:px-1 [&_code]:rounded"
                        dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }}
                      />

                      {message.role === "assistant" && (
                        <div className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className="h-6 px-2 text-xs text-[#8B9A8F]"
                          >
                            {copiedId === message.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePasteToNote(message.content, message.id)}
                            className="h-6 px-2 text-xs text-[#8B9A8F]"
                          >
                            {pastedMessageIds.has(message.id) ? <Check className="w-3 h-3 mr-1" /> : <ClipboardPaste className="w-3 h-3 mr-1" />}
                            {pastedMessageIds.has(message.id) ? "Pasted" : "Paste to Note"}
                          </Button>
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
          </>
        )}
      </div>

      {/* Agent Instructions Modal */}
      <Dialog open={showInstructionsModal} onOpenChange={setShowInstructionsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {agent.name} Instructions
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-[#5C7A6B]">
              Add custom instructions for {agent.name}. These will be included in every conversation.
            </p>
            
            <Textarea
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              placeholder={`Example: "Always be concise. Reference my job search context. Remind me to take breaks."`}
              className="min-h-[150px] border-[#E8DCC4]"
            />
            
            <p className="text-xs text-[#8B9A8F]">
              💡 Tip: Include context like your current projects, preferred communication style, or specific areas you want help with.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstructionsModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveAgentInstructions}
              disabled={isSavingInstructions}
              className="bg-[#2D5A47] hover:bg-[#1E3D32]"
            >
              {isSavingInstructions ? "Saving..." : "Save Instructions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Memory Modal */}
      <Dialog open={showMemoryModal} onOpenChange={setShowMemoryModal}>
        <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              {agent.name} Memory
            </DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-[#5C7A6B]">
            Insights and patterns learned from your conversations. These help personalize responses.
          </p>
          
          <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4">
            {agentMemories.length === 0 ? (
              <div className="text-center py-8 text-[#8B9A8F]">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No memories yet</p>
                <p className="text-xs mt-1">Memories are created as you chat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agentMemories.map((memory) => (
                  <div key={memory.id} className="p-3 rounded-lg bg-[#F5F0E6] border border-[#E8DCC4]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-[#1E3D32]">{memory.content}</p>
                      <span className="text-xs text-[#8B9A8F] whitespace-nowrap">
                        {formatDate(memory.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8DCC4] text-[#5C7A6B]">
                        {memory.insight_type}
                      </span>
                      <span className="text-xs text-[#8B9A8F]">
                        from {memory.source_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemoryModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
