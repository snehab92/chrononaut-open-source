import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if already onboarded
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to Chrononaut</h1>
          <p className="text-muted-foreground">
            Let&apos;s set up your ADHD-optimized workspace
          </p>
        </div>
        <OnboardingForm 
          userId={user.id} 
          initialName={profile?.full_name || user.user_metadata?.full_name || ""} 
        />
      </div>
    </div>
  );
}
