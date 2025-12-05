import { createClient } from "@/lib/supabase/server";
import { Battery, Heart, Shield, Target, Compass } from "lucide-react";
import { TaskList } from "@/components/dashboard/task-list";
import { TickTickClient } from "@/lib/ticktick/client";

async function getWeekTasks(supabase: any, userId: string) {
  // Get TickTick token
  const { data: tokenData } = await supabase
    .from("integration_tokens")
    .select("encrypted_access_token, encrypted_refresh_token")
    .eq("user_id", userId)
    .eq("provider", "ticktick")
    .single();

  if (!tokenData) {
    return { connected: false, tasks: [] };
  }

  try {
    const client = TickTickClient.fromToken(
      tokenData.encrypted_access_token,
      tokenData.encrypted_refresh_token
    );

    const allData = await client.getAllTasks();
    
    // Get week boundaries (include overdue + next 7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Filter for this week's tasks (due within 7 days or overdue)
    const weekTasks = allData.syncTaskBean.update
      .filter((task: any) => {
        if (task.status === 2) return false; // Skip completed
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate < endOfWeek; // Due this week or overdue
      })
      .map((task: any) => ({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        priority: task.priority || 0,
        dueDate: task.dueDate,
        isCompleted: task.status === 2,
      }))
      .sort((a: any, b: any) => {
        // Sort by date first, then priority
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return b.priority - a.priority;
      });

    return { connected: true, tasks: weekTasks };
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return { connected: true, tasks: [] };
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

  // Fetch tasks (full week for toggle)
  const { connected: tickTickConnected, tasks } = await getWeekTasks(
    supabase,
    user?.id || ""
  );

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

      {/* Tasks and Calendar */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Today's Tasks */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm">
          <div className="mb-4">
            <h2 className="font-serif text-lg font-semibold text-[#1E3D32]">Tasks</h2>
            <p className="text-sm text-[#8B9A8F]">
              {tickTickConnected 
                ? `${tasks.length} task${tasks.length !== 1 ? 's' : ''} this week`
                : "Connect TickTick to see tasks"
              }
            </p>
          </div>
          <TaskList tasks={tasks} isConnected={tickTickConnected} />
        </div>

        {/* Calendar */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm">
          <div className="mb-4">
            <h2 className="font-serif text-lg font-semibold text-[#1E3D32]">Calendar</h2>
            <p className="text-sm text-[#8B9A8F]">Connect Google Calendar to see events</p>
          </div>
          <div className="flex items-center justify-center h-32 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
            No events today
          </div>
        </div>
      </div>
    </div>
  );
}
