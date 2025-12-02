import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer } from "lucide-react";

export default function FocusPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Focus</h1>
        <p className="text-muted-foreground">
          Deep work sessions with hyperfocus protection.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            Focus timer with mode selection, task tracking, and AI coaching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Week 3 & 8 of build plan
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
