"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Link2, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  authType: "oauth" | "direct";
}

const INTEGRATIONS: Integration[] = [
  {
    id: "ticktick",
    name: "TickTick",
    description: "Sync tasks bidirectionally for smart task management",
    icon: "✓",
    authType: "direct", // Changed from OAuth
  },
  {
    id: "whoop",
    name: "Whoop",
    description: "Import recovery, sleep, and strain data for energy tracking",
    icon: "💪",
    authType: "oauth", // Week 4
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Mirror your calendar for meeting prep and time awareness",
    icon: "📅",
    authType: "oauth", // Week 9
  },
];

interface IntegrationsCardProps {
  connectedProviders: Map<string, string>;
}

export function IntegrationsCard({ connectedProviders }: IntegrationsCardProps) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  
  // TickTick login modal state
  const [tickTickModalOpen, setTickTickModalOpen] = useState(false);
  const [tickTickCredentials, setTickTickCredentials] = useState({ username: "", password: "" });

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleConnect = (integration: Integration) => {
    if (integration.id === "ticktick") {
      setTickTickModalOpen(true);
    } else {
      // Future OAuth integrations
      showMessage("error", `${integration.name} integration coming soon!`);
    }
  };

  const handleTickTickLogin = async () => {
    if (!tickTickCredentials.username || !tickTickCredentials.password) {
      showMessage("error", "Please enter both email and password.");
      return;
    }

    setConnecting("ticktick");

    try {
      const response = await fetch("/api/integrations/ticktick/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tickTickCredentials),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", `TickTick connected! Found ${data.projectCount} projects.`);
        setTickTickModalOpen(false);
        setTickTickCredentials({ username: "", password: "" });
        // Refresh page to update connected status
        window.location.reload();
      } else {
        showMessage("error", data.error || "Failed to connect to TickTick.");
      }
    } catch (error) {
      showMessage("error", "Connection failed. Please try again.");
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    try {
      const response = await fetch(`/api/integrations/${providerId}/disconnect`, {
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
    <>
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
            const isAvailable = integration.id === "ticktick"; // Only TickTick ready for now

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
                  ) : isAvailable ? (
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
                  ) : (
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* TickTick Login Modal */}
      <Dialog open={tickTickModalOpen} onOpenChange={setTickTickModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect TickTick</DialogTitle>
            <DialogDescription>
              Enter your TickTick email and password. Your credentials are sent directly to 
              TickTick and are not stored—only a session token is saved.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ticktick-email">Email</Label>
              <Input
                id="ticktick-email"
                type="email"
                placeholder="you@example.com"
                value={tickTickCredentials.username}
                onChange={(e) =>
                  setTickTickCredentials((prev) => ({ ...prev, username: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticktick-password">Password</Label>
              <Input
                id="ticktick-password"
                type="password"
                placeholder="Your TickTick password"
                value={tickTickCredentials.password}
                onChange={(e) =>
                  setTickTickCredentials((prev) => ({ ...prev, password: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                If you use Google Sign-In, you'll need to{" "}
                <a
                  href="https://ticktick.com/webapp/#settings/password"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  set a password in TickTick settings
                </a>{" "}
                first.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTickTickModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTickTickLogin} disabled={connecting === "ticktick"}>
              {connecting === "ticktick" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
