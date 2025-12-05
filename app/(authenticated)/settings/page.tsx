import { createClient } from "@/lib/supabase/server";
import { IntegrationsCard } from "@/components/settings/integrations-card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch user's connected integrations
  const { data: integrations } = await supabase
    .from('integration_tokens')
    .select('provider, updated_at')
    .eq('user_id', user?.id);
  
  // Create a map of connected providers
  const connectedProviders = new Map(
    integrations?.map(i => [i.provider, i.updated_at]) || []
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and integrations.
        </p>
      </div>

      <IntegrationsCard connectedProviders={connectedProviders} />
    </div>
  );
}
