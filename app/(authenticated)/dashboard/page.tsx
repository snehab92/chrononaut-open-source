import { createClient } from "@/lib/supabase/server";
import { Battery, Heart, Shield, Target, Compass } from "lucide-react";

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
            <h2 className="font-serif text-lg font-semibold text-[#1E3D32]">Today's Tasks</h2>
            <p className="text-sm text-[#8B9A8F]">Connect TickTick to see tasks</p>
          </div>
          <div className="flex items-center justify-center h-32 text-[#8B9A8F] text-sm border-2 border-dashed border-[#E8DCC4] rounded-xl">
            No tasks yet
          </div>
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
