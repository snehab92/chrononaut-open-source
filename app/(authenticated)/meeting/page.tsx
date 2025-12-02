import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function MeetingPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meeting</h1>
        <p className="text-muted-foreground">
          Meeting prep, notes, and AI coaching.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            Meeting screen with transcription, notes, and social coaching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Week 7 of build plan
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
