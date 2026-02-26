import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if user already has data (prevent double-seeding)
  const { count: noteCount } = await supabase
    .from("notes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (noteCount && noteCount > 0) {
    return Response.json({ message: "User already has data, skipping seed" });
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString().split("T")[0];

  try {
    // 1. Create a "Getting Started" folder
    const { data: folder } = await supabase
      .from("folders")
      .insert({
        user_id: user.id,
        name: "Getting Started",
        folder_type: "notebook",
        sort_order: 0,
      })
      .select("id")
      .single();

    const folderId = folder?.id;

    // 2. Create sample notes
    const sampleNotes = [
      {
        user_id: user.id,
        title: "Welcome to Chrononaut",
        note_type: "document" as const,
        folder_id: folderId,
        is_starred: true,
        content: `<h1>Welcome to Chrononaut</h1>
<p>Your personal productivity and self-awareness workspace. Here's what you can do:</p>

<h2>Core Features</h2>
<ul>
  <li><strong>Notes</strong> — Write documents, meeting notes, and quick captures. Organize them into folders.</li>
  <li><strong>Tasks</strong> — Track your to-dos with priorities and due dates right from the dashboard.</li>
  <li><strong>Journal</strong> — Daily reflection with mood tracking and AI-powered insights.</li>
  <li><strong>Focus Mode</strong> — Deep work sessions with gentle cues to keep you on track.</li>
  <li><strong>AI Chat</strong> — Press <code>⌘/</code> anytime to chat with your AI coaching agents.</li>
</ul>

<h2>Getting Started</h2>
<ol>
  <li>Add a few tasks to your dashboard to plan your day</li>
  <li>Try writing a journal entry — the AI will help you reflect</li>
  <li>Start a focus session when you're ready to do deep work</li>
  <li>Connect Google Calendar in Settings for meeting prep</li>
</ol>

<p><em>This is a sample note — feel free to edit or delete it!</em></p>`,
      },
      {
        user_id: user.id,
        title: "Meeting Notes Template",
        note_type: "meeting" as const,
        folder_id: folderId,
        content: `<h2>Meeting Notes</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>Attendees:</strong> You, Team</p>
<p><strong>Purpose:</strong> Weekly sync</p>

<h3>Agenda</h3>
<ul>
  <li>Review progress on current sprint</li>
  <li>Discuss blockers and dependencies</li>
  <li>Plan next steps</li>
</ul>

<h3>Discussion</h3>
<p>This is a sample meeting note to show you the template. Use the meeting screen to take notes during calls, or create meeting notes from your calendar events.</p>

<h3>Action Items</h3>
<ul>
  <li><strong>Who:</strong> You | <strong>What:</strong> Try creating your own meeting note | <strong>By:</strong> This week</li>
</ul>

<h3>Next Steps</h3>
<p>Explore the meeting features — you can enable AI coaching and live transcription.</p>`,
      },
      {
        user_id: user.id,
        title: "Quick thought",
        note_type: "quick capture" as const,
        content: `<p>This is a quick capture — perfect for jotting down ideas on the fly. You can always expand it into a full document later.</p>`,
      },
    ];

    await supabase.from("notes").insert(sampleNotes);

    // 3. Create sample tasks
    const tomorrow = new Date(now.getTime() + 86400000);
    const nextWeek = new Date(now.getTime() + 7 * 86400000);

    const sampleTasks = [
      {
        user_id: user.id,
        title: "Write your first journal entry",
        content: "Head to the Journal tab and reflect on your day",
        priority: 2,
        due_date: tomorrow.toISOString(),
        completed: false,
      },
      {
        user_id: user.id,
        title: "Try a focus session",
        content: "Use Focus mode for 25 minutes of deep work",
        priority: 1,
        due_date: tomorrow.toISOString(),
        completed: false,
      },
      {
        user_id: user.id,
        title: "Customize your AI agent instructions",
        content: "Open the AI chat (⌘/) and set custom instructions for each agent",
        priority: 0,
        due_date: nextWeek.toISOString(),
        completed: false,
      },
      {
        user_id: user.id,
        title: "Connect Google Calendar",
        content: "Go to Settings to connect your calendar for meeting prep features",
        priority: 0,
        due_date: nextWeek.toISOString(),
        completed: false,
      },
    ];

    await supabase.from("tasks").insert(sampleTasks);

    // 4. Create a sample journal entry (for yesterday, so today feels fresh)
    const sampleJournal = {
      user_id: user.id,
      entry_date: yesterday,
      happened: "Started using Chrononaut — excited to have a dedicated space for reflection and productivity tracking.",
      feelings: "Feeling optimistic and curious about building better habits. A little overwhelmed by all the features, but in a good way.",
      grateful: "Grateful for having the time and space to invest in personal growth tools.",
      mood_label: "Creative" as const,
      energy_rating: 7,
      tags: ["getting-started", "reflection"],
    };

    await supabase.from("journal_entries").insert(sampleJournal);

    return Response.json({ success: true, message: "Sample data created" });
  } catch (error) {
    console.error("Error seeding sample data:", error);
    return Response.json(
      { error: "Failed to create sample data" },
      { status: 500 }
    );
  }
}
