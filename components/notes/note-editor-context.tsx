"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { Editor } from "@tiptap/core";

interface EditorRef {
  editor: Editor;
  noteId: string | null;
}

interface NoteEditorContextValue {
  // Editor state
  activeEditorId: string | null;
  lastCursorPosition: number | null;

  // Actions
  registerEditor: (id: string, noteId: string | null, editor: Editor) => void;
  unregisterEditor: (id: string) => void;
  setActiveEditor: (id: string | null) => void;
  updateCursorPosition: (position: number) => void;
  updateNoteId: (editorId: string, noteId: string) => void;

  // Paste functionality
  pasteToActiveEditor: (content: string) => boolean;
  hasActiveEditor: () => boolean;
  getActiveNoteId: () => string | null;

  // Note creation callback (set by pages that can create notes)
  onCreateNoteAndPaste: ((content: string) => Promise<string | null>) | null;
  setOnCreateNoteAndPaste: (fn: ((content: string) => Promise<string | null>) | null) => void;
}

const NoteEditorContext = createContext<NoteEditorContextValue | null>(null);

export function NoteEditorProvider({ children }: { children: React.ReactNode }) {
  const editorsRef = useRef<Map<string, EditorRef>>(new Map());
  const [activeEditorId, setActiveEditorIdState] = useState<string | null>(null);
  const [lastCursorPosition, setLastCursorPosition] = useState<number | null>(null);
  const [onCreateNoteAndPaste, setOnCreateNoteAndPasteState] = useState<((content: string) => Promise<string | null>) | null>(null);

  const registerEditor = useCallback((id: string, noteId: string | null, editor: Editor) => {
    editorsRef.current.set(id, { editor, noteId });
  }, []);

  const unregisterEditor = useCallback((id: string) => {
    editorsRef.current.delete(id);
  }, []);

  const setActiveEditor = useCallback((id: string | null) => {
    setActiveEditorIdState(id);
  }, []);

  const updateCursorPosition = useCallback((position: number) => {
    setLastCursorPosition(position);
  }, []);

  const updateNoteId = useCallback((editorId: string, noteId: string) => {
    const editorRef = editorsRef.current.get(editorId);
    if (editorRef) {
      editorRef.noteId = noteId;
    }
  }, []);

  const hasActiveEditor = useCallback((): boolean => {
    if (!activeEditorId) return false;
    return editorsRef.current.has(activeEditorId);
  }, [activeEditorId]);

  const getActiveNoteId = useCallback((): string | null => {
    if (!activeEditorId) return null;
    return editorsRef.current.get(activeEditorId)?.noteId ?? null;
  }, [activeEditorId]);

  const pasteToActiveEditor = useCallback((content: string): boolean => {
    if (!activeEditorId) return false;

    const editorRef = editorsRef.current.get(activeEditorId);
    if (!editorRef) return false;

    const { editor } = editorRef;

    // Use stored cursor position or end of document
    const position = lastCursorPosition ?? editor.state.doc.content.size;

    // Insert content at position
    editor.chain()
      .focus()
      .insertContentAt(position, content)
      .run();

    return true;
  }, [activeEditorId, lastCursorPosition]);

  const setOnCreateNoteAndPaste = useCallback((fn: ((content: string) => Promise<string | null>) | null) => {
    setOnCreateNoteAndPasteState(() => fn);
  }, []);

  return (
    <NoteEditorContext.Provider value={{
      activeEditorId,
      lastCursorPosition,
      registerEditor,
      unregisterEditor,
      setActiveEditor,
      updateCursorPosition,
      updateNoteId,
      pasteToActiveEditor,
      hasActiveEditor,
      getActiveNoteId,
      onCreateNoteAndPaste,
      setOnCreateNoteAndPaste,
    }}>
      {children}
    </NoteEditorContext.Provider>
  );
}

export function useNoteEditor() {
  const context = useContext(NoteEditorContext);
  if (!context) {
    // Return a no-op context when not wrapped in provider
    // This allows chat-drawer to work even when context isn't available
    return {
      activeEditorId: null,
      lastCursorPosition: null,
      registerEditor: () => {},
      unregisterEditor: () => {},
      setActiveEditor: () => {},
      updateCursorPosition: () => {},
      updateNoteId: () => {},
      pasteToActiveEditor: () => false,
      hasActiveEditor: () => false,
      getActiveNoteId: () => null,
      onCreateNoteAndPaste: null,
      setOnCreateNoteAndPaste: () => {},
    };
  }
  return context;
}

// Optional hook that throws if context is missing (for components that require it)
export function useNoteEditorRequired() {
  const context = useContext(NoteEditorContext);
  if (!context) {
    throw new Error("useNoteEditorRequired must be used within NoteEditorProvider");
  }
  return context;
}
