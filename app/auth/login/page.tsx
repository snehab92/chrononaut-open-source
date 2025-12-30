import { LoginForm } from "@/components/login-form";
import { Compass, Waves } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-svh w-full bg-gradient-to-br from-[#FDFBF7] via-[#F5F0E6] to-[#EDE5D4] flex flex-col pt-8">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top right decorative circle */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#2D5A47]/10 to-[#1E3D32]/5 blur-3xl" />
        {/* Bottom left decorative circle */}
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#D4A84B]/10 to-[#E8DCC4]/20 blur-3xl" />
        {/* Subtle wave pattern at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#2D5A47]/5 to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5A47] to-[#1E3D32] flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
            <Compass className="h-5 w-5 text-[#E8DCC4]" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-semibold text-lg tracking-tight text-[#1E3D32]">
              Chrononaut
            </span>
            <span className="text-[10px] text-[#5C7A6B] tracking-widest uppercase">
              Master Your Time
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Welcome section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2D5A47] to-[#1E3D32] shadow-xl mb-6 transform hover:scale-105 transition-transform">
              <Compass className="h-10 w-10 text-[#E8DCC4]" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#1E3D32] mb-2">
              Welcome Back, Navigator
            </h1>
            <p className="text-[#5C7A6B] flex items-center justify-center gap-2">
              <Waves className="h-4 w-4 text-[#D4A84B]" />
              <span className="italic">The tides of time await</span>
              <Waves className="h-4 w-4 text-[#D4A84B]" />
            </p>
          </div>

          {/* Login form */}
          <LoginForm />

          {/* Footer note */}
          <p className="mt-8 text-center text-xs text-[#8B9A8F]">
            Your ADHD-optimized productivity companion
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <p className="text-xs text-[#8B9A8F]">
            Navigate your day with intention
          </p>
        </div>
      </footer>
    </div>
  );
}
