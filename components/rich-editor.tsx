"use client";

import { useEffect, useId } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, List, ListOrdered, Heading1, Heading2,
  Quote, Undo, Redo, Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SlashCommandExtension } from "@/lib/tiptap/slash-command-extension";
import { createMeetingWidgetExtension } from "@/lib/tiptap/meeting-widget-extension";
import { MeetingTranscriptionWidget } from "@/components/transcription/MeetingTranscriptionWidget";
import { useNoteEditor } from "@/components/notes/note-editor-context";

// Create meeting widget extension with React component
const MeetingWidgetExtension = createMeetingWidgetExtension(MeetingTranscriptionWidget);

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  noteId?: string | null;  // For paste-to-note tracking
  hideToolbar?: boolean;   // Hide toolbar (use slash commands instead)
}

export function RichEditor({ content, onChange, placeholder = "Start writing...", noteId, hideToolbar = false }: RichEditorProps) {
  const editorId = useId();
  const { registerEditor, unregisterEditor, setActiveEditor, updateCursorPosition, updateNoteId } = useNoteEditor();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      SlashCommandExtension,
      MeetingWidgetExtension,
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[calc(100vh-16rem)] text-[#1E3D32]",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => {
      setActiveEditor(editorId);
    },
    onBlur: ({ editor }) => {
      // Store cursor position when focus leaves editor (e.g., when clicking chat drawer)
      updateCursorPosition(editor.state.selection.from);
    },
    onSelectionUpdate: ({ editor }) => {
      // Keep cursor position updated as user moves within editor
      updateCursorPosition(editor.state.selection.from);
    },
  });

  // Register editor with context on mount
  useEffect(() => {
    if (editor) {
      registerEditor(editorId, noteId ?? null, editor);
      return () => {
        unregisterEditor(editorId);
      };
    }
  }, [editor, editorId, noteId, registerEditor, unregisterEditor]);

  // Update noteId in context when it changes
  useEffect(() => {
    if (noteId) {
      updateNoteId(editorId, noteId);
    }
  }, [noteId, editorId, updateNoteId]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children,
    title
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className={cn(
        "h-8 w-8 p-0",
        isActive && "bg-[#E8DCC4] text-[#1E3D32]"
      )}
    >
      {children}
    </Button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar - can be hidden for slash-command-only mode */}
      {!hideToolbar && (
        <div className="flex items-center gap-1 p-2 border-b border-[#E8DCC4] bg-white sticky top-0 z-10 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold (⌘B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic (⌘I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo (⌘Z)"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo (⌘⇧Z)"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 p-4 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
