import { redirect } from "next/navigation";

// Redirect legacy /protected route to /dashboard
export default function ProtectedPage() {
  redirect("/dashboard");
}
