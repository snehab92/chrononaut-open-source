import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { ChatProvider } from "@/components/chat/chat-provider";
import { NoteEditorProvider } from "@/components/notes/note-editor-context";
import { QuickTaskProvider } from "@/components/shared/quick-task-dialog";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <NoteEditorProvider>
      <ChatProvider>
        <QuickTaskProvider>
          <AppShell user={{ full_name: profile?.full_name || "", email: user.email || "" }}>
            <KeyboardShortcuts />
            {children}
          </AppShell>
        </QuickTaskProvider>
      </ChatProvider>
    </NoteEditorProvider>
  );
}
