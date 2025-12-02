import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
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
    <div className="flex min-h-screen w-full flex-col p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          Your Chrononaut dashboard is coming soon.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Energy</h3>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Connect Whoop to track</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Mood</h3>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Journal to track</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Self-Compassion</h3>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Take assessment</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Values Alignment</h3>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Take assessment</p>
        </div>
      </div>
    </div>
  );
}
