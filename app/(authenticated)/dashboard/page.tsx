import { createClient } from "@/lib/supabase/server";
import { Battery, Heart, Shield, Target, Compass } from "lucide-react";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

async function getInitialData(supabase: any, userId: string) {
  // Check integration connections
  const { data: integrations } = await supabase
    .from("integration_tokens")
    .select("provider")
    .eq("user_id", userId);

  const providers = new Set((integrations || []).map((i: any) => i.provider));
  const isTickTickConnected = providers.has("ticktick");
  const isGoogleCalendarConnected = providers.has("google_calendar");

  // Fetch tasks if TickTick connected
  let tasks: any[] = [];
  if (isTickTickConnected) {
    const { data: taskData, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("completed", false)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (!error && taskData) {
      tasks = taskData.map((task: any) => ({
        id: task.ticktick_id || task.id,
        localId: task.id,
        title: task.title,
        projectId: task.ticktick_list_id,
        priority: mapLocalPriority(task.priority),
        dueDate: task.due_date,
        isCompleted: task.completed,
        syncStatus: task.sync_status,
      }));
    }
  }

  // Fetch events if Google Calendar connected
  let events: any[] = [];
  if (isGoogleCalendarConnected) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: eventData, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .gte("start_time", now.toISOString())
      .lte("start_time", thirtyDaysFromNow.toISOString())
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    if (!error && eventData) {
      events = eventData.map((event: any) => ({
        id: event.id,
        googleEventId: event.google_event_id,
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.start_time,
        endTime: event.end_time,
        allDay: event.all_day,
        attendees: typeof event.attendees === "string"
          ? JSON.parse(event.attendees)
          : event.attendees || [],
        organizerEmail: event.organizer_email,
        status: event.status,
        meetingLink: event.meeting_link,
      }));
    }
  }

  return {
    isTickTickConnected,
    isGoogleCalendarConnected,
    tasks,
    events,
  };
}

// Map local priority (0-4) back to TickTick format (0,1,3,5) for UI consistency
function mapLocalPriority(localPriority: number): number {
  switch (localPriority) {
    case 3: return 5; // high
    case 2: return 3; // medium
    case 1: return 1; // low
    default: return 0; // none
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0];

  // Fetch initial data server-side
  const {
    isTickTickConnected,
    isGoogleCalendarConnected,
    tasks: initialTasks,
    events: initialEvents,
  } = await getInitialData(supabase, user?.id || "");

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[#8B9A8F] text-sm">
          <Compass className="h-4 w-4" />
          <span>Your voyage today</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-[#1E3D32] tracking-tight">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-[#5C7A6B]">
          Here's how you're navigating today.
        </p>
      </div>

      {/* Analytics Grid - 2x2 */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Energy */}
        <div className="group p-5 rounded-2xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#5C7A6B]">Energy</span>
            <div className="p-2 rounded-xl bg-[#E8DCC4]/50 text-[#2D5A47] group-hover:bg-[#2D5A47] group-hover:text-[#E8DCC4] transition-colors">
              <Battery className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-serif font-semibold text-[#1E3D32]">--</div>
            <p className="text-xs text-[#8B9A8F]">
              Connect Whoop to track
            </p>
          </div>
        </div>

        {/* Mood */}
        <div className="group p-5 rounded-2xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#5C7A6B]">Mood</span>
            <div className="p-2 rounded-xl bg-[#E8DCC4]/50 text-[#D4A84B] group-hover:bg-[#D4A84B] group-hover:text-white transition-colors">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-serif font-semibold text-[#1E3D32]">--</div>
            <p className="text-xs text-[#8B9A8F]">
              Journal to track
            </p>
          </div>
        </div>

        {/* Self-Compassion */}
        <div className="group p-5 rounded-2xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#5C7A6B]">Self-Compassion</span>
            <div className="p-2 rounded-xl bg-[#E8DCC4]/50 text-[#2D5A47] group-hover:bg-[#2D5A47] group-hover:text-[#E8DCC4] transition-colors">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-serif font-semibold text-[#1E3D32]">--</div>
            <p className="text-xs text-[#8B9A8F]">
              Take assessment
            </p>
          </div>
        </div>

        {/* Values Alignment */}
        <div className="group p-5 rounded-2xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#5C7A6B]">Values Alignment</span>
            <div className="p-2 rounded-xl bg-[#E8DCC4]/50 text-[#D4A84B] group-hover:bg-[#D4A84B] group-hover:text-white transition-colors">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-serif font-semibold text-[#1E3D32]">--</div>
            <p className="text-xs text-[#8B9A8F]">
              Take assessment
            </p>
          </div>
        </div>
      </div>

      {/* Tasks and Calendar - Client Component */}
      <DashboardClient 
        initialTasks={initialTasks}
        initialEvents={initialEvents}
        isTickTickConnected={isTickTickConnected}
        isGoogleCalendarConnected={isGoogleCalendarConnected}
      />
    </div>
  );
}
