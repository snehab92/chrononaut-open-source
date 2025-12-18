import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeTasks, Task } from "@/lib/ai/task-analysis";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { tasks } = await request.json();
    
    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "tasks array required" },
        { status: 400 }
      );
    }
    
    // Analyze tasks
    const analyses = await analyzeTasks(user.id, tasks as Task[]);
    
    return NextResponse.json({ analyses });
  } catch (error) {
    console.error("Task analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze tasks" },
      { status: 500 }
    );
  }
}
