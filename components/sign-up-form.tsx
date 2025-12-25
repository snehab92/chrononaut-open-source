"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Mail, Lock, KeyRound, ArrowRight } from "lucide-react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Card with Chrononaut styling */}
      <div className="rounded-2xl border border-[#E8DCC4] bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden">
        {/* Decorative top border */}
        <div className="h-1 bg-gradient-to-r from-[#2D5A47] via-[#D4A84B] to-[#2D5A47]" />

        <div className="p-8">
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-5">
              {/* Email field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-[#2D5A47]"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B9A8F]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="navigator@chrononaut.io"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-[#D4C5A9] bg-[#FDFBF7] focus:border-[#2D5A47] focus:ring-[#2D5A47]/20 transition-all placeholder:text-[#8B9A8F]/60"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-[#2D5A47]"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B9A8F]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-[#D4C5A9] bg-[#FDFBF7] focus:border-[#2D5A47] focus:ring-[#2D5A47]/20 transition-all placeholder:text-[#8B9A8F]/60"
                  />
                </div>
              </div>

              {/* Confirm Password field */}
              <div className="space-y-2">
                <Label
                  htmlFor="repeat-password"
                  className="text-sm font-medium text-[#2D5A47]"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B9A8F]" />
                  <Input
                    id="repeat-password"
                    type="password"
                    placeholder="Confirm your password"
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-[#D4C5A9] bg-[#FDFBF7] focus:border-[#2D5A47] focus:ring-[#2D5A47]/20 transition-all placeholder:text-[#8B9A8F]/60"
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#2D5A47] to-[#1E3D32] hover:from-[#1E3D32] hover:to-[#152A24] text-[#E8DCC4] font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating your account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4C5A9] to-transparent" />
            <span className="text-xs text-[#8B9A8F] uppercase tracking-wider">Already a navigator?</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4C5A9] to-transparent" />
          </div>

          {/* Login link */}
          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#D4C5A9] text-[#2D5A47] hover:bg-[#F5F0E6] hover:border-[#2D5A47] transition-all duration-200 text-sm font-medium"
            >
              Return to Login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
