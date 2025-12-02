import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

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
    <AppShell user={{ full_name: profile?.full_name || "", email: user.email || "" }}>
      <KeyboardShortcuts />
      {children}
    </AppShell>
  );
}
