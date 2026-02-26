"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Link2, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  authType: "oauth";
}

const INTEGRATIONS: Integration[] = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Mirror your calendar for meeting prep and time awareness",
    icon: "📅",
    authType: "oauth",
  },
  {
    id: "whoop",
    name: "Whoop",
    description: "Import recovery, sleep, strain, and workout data for energy tracking",
    icon: "💪",
    authType: "oauth",
  },
];

interface IntegrationsCardProps {
  connectedProviders: Map<string, string>;
}

export function IntegrationsCard({ connectedProviders }: IntegrationsCardProps) {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  // Handle OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'google_connected') {
      showMessage("success", "Google Calendar connected successfully!");
    } else if (success === 'whoop_connected') {
      showMessage("success", "Whoop connected successfully! Health data synced.");
    } else if (error === 'google_auth_failed') {
      showMessage("error", "Failed to connect Google Calendar. Please try again.");
    } else if (error === 'whoop_auth_failed') {
      showMessage("error", "Failed to connect Whoop. Please try again.");
    } else if (error === 'token_invalid') {
      showMessage("error", "Token validation failed. Please try again.");
    }
  }, [searchParams]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleConnect = (integration: Integration) => {
    if (integration.id === "google_calendar") {
      setConnecting("google_calendar");
      window.location.href = "/api/integrations/google/authorize";
    } else if (integration.id === "whoop") {
      setConnecting("whoop");
      window.location.href = "/api/integrations/whoop/authorize";
    } else {
      showMessage("error", `${integration.name} integration coming soon!`);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    try {
      let apiPath: string;
      if (providerId === "google_calendar") {
        apiPath = "/api/integrations/google/disconnect";
      } else {
        apiPath = `/api/integrations/${providerId}/disconnect`;
      }

      const response = await fetch(apiPath, {
        method: "POST",
      });

      if (response.ok) {
        showMessage("success", "Disconnected successfully.");
        window.location.reload();
      } else {
        showMessage("error", "Failed to disconnect. Please try again.");
      }
    } catch (error) {
      showMessage("error", "Failed to disconnect. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Integrations
        </CardTitle>
        <CardDescription>
          Connect your productivity and health apps for personalized insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status message */}
        {message && (
          <div
            className={`p-3 rounded-md text-sm flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        {/* Integration list */}
        {INTEGRATIONS.map((integration) => {
          const isConnected = connectedProviders.has(integration.id);
          const connectedAt = connectedProviders.get(integration.id);

          return (
            <div
              key={integration.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{integration.icon}</span>
                <div>
                  <h3 className="font-medium">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                  {isConnected && connectedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Connected {new Date(connectedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div>
                {isConnected ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleConnect(integration)}
                    disabled={connecting === integration.id}
                  >
                    {connecting === integration.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
