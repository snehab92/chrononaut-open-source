"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  FileText,
  Timer,
  Users,
  BookOpen,
  Plus,
  Menu,
  ChevronLeft,
  LogOut,
  Settings,
  Compass,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useChatDrawer } from "@/components/chat/chat-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "⌘D" },
  { href: "/notes", label: "Notes", icon: FileText, shortcut: "⌘N" },
  { href: "/focus", label: "Focus", icon: Timer, shortcut: "⌘F" },
  { href: "/meeting", label: "Meeting", icon: Users, shortcut: "⌘M" },
  { href: "/journal", label: "Journal", icon: BookOpen, shortcut: "⌘J" },
];

interface AppShellProps {
  children: React.ReactNode;
  user?: { full_name?: string; email?: string };
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Use the chat drawer context
  const { openChat } = useChatDrawer();

  // Determine context from current path
  const getContext = () => {
    if (pathname.includes("/notes")) return { type: "general" as const };
    if (pathname.includes("/journal")) return { type: "journal" as const };
    if (pathname.includes("/focus")) return { type: "focus" as const };
    if (pathname.includes("/meeting")) return { type: "meeting" as const };
    return { type: "general" as const };
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  const handleOpenChat = () => {
    openChat(getContext());
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full", mobile ? "p-5" : "p-4")}>
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 mb-8",
        collapsed && !mobile && "justify-center"
      )}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5A47] to-[#1E3D32] flex items-center justify-center shadow-md transform transition-transform hover:scale-105">
          <Compass className="h-5 w-5 text-[#E8DCC4]" />
        </div>
        {(!collapsed || mobile) && (
          <div className="flex flex-col flex-1">
            <span className="font-serif font-semibold text-lg tracking-tight text-[#1E3D32]">
              Chrononaut
            </span>
            <span className="text-[10px] text-[#5C7A6B] tracking-widest uppercase">
              The tides of time await
            </span>
          </div>
        )}
        {!mobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0 text-[#5C7A6B] hover:text-[#2D5A47] hover:bg-[#E8DCC4]/50"
          >
            <ChevronLeft
              className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")}
            />
          </Button>
        )}
      </div>

      {/* Quick Add Button */}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "mb-6 gap-2 border-[#D4C5A9] bg-gradient-to-r from-[#F5F0E6] to-[#FDFBF7] hover:from-[#EDE5D4] hover:to-[#F5F0E6] text-[#5C4B32] shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
                collapsed && !mobile ? "w-10 h-10 p-0" : "w-full justify-start h-11"
              )}
            >
              <Plus className="h-4 w-4" />
              {(!collapsed || mobile) && <span className="font-medium">Quick Task</span>}
              {(!collapsed || mobile) && (
                <kbd className="ml-auto text-xs text-[#8B7355] bg-white/60 px-2 py-0.5 rounded-md border border-[#D4C5A9]">
                  ⌘T
                </kbd>
              )}
            </Button>
          </TooltipTrigger>
          {collapsed && !mobile && (
            <TooltipContent side="right" className="bg-[#1E3D32] text-[#E8DCC4] border-none">
              Quick Task (⌘T)
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={() => mobile && setMobileOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-[#2D5A47] text-[#E8DCC4] shadow-md"
                        : "text-[#5C7A6B] hover:bg-[#E8DCC4]/50 hover:text-[#2D5A47]",
                      collapsed && !mobile && "justify-center px-2"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#D4A84B] rounded-r-full" />
                    )}
                    <item.icon className={cn(
                      "h-4 w-4 flex-shrink-0 transition-transform duration-200",
                      !isActive && "group-hover:scale-110"
                    )} />
                    {(!collapsed || mobile) && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        <kbd className={cn(
                          "text-xs px-1.5 py-0.5 rounded-md transition-colors",
                          isActive 
                            ? "text-[#E8DCC4]/70 bg-white/10" 
                            : "text-[#8B9A8F] bg-[#E8DCC4]/30"
                        )}>
                          {item.shortcut}
                        </kbd>
                      </>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && !mobile && (
                  <TooltipContent side="right" className="bg-[#1E3D32] text-[#E8DCC4] border-none">
                    {item.label} ({item.shortcut})
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* Divider */}
      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4C5A9] to-transparent" />
      </div>

      {/* AI Chat Button */}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={handleOpenChat}
              className={cn(
                "mb-4 gap-2 border-[#2D5A47] bg-[#2D5A47]/10 hover:bg-[#2D5A47]/20 text-[#2D5A47] transition-all duration-200",
                collapsed && !mobile ? "w-10 h-10 p-0" : "w-full justify-start h-11"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              {(!collapsed || mobile) && <span className="font-medium">AI Coach</span>}
              {(!collapsed || mobile) && (
                <kbd className="ml-auto text-xs text-[#2D5A47]/70 bg-white/60 px-2 py-0.5 rounded-md border border-[#2D5A47]/30">
                  ⌘/
                </kbd>
              )}
            </Button>
          </TooltipTrigger>
          {collapsed && !mobile && (
            <TooltipContent side="right" className="bg-[#1E3D32] text-[#E8DCC4] border-none">
              AI Coach (⌘/)
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* User Profile Card */}
      {(!collapsed || mobile) && user && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-[#F5F0E6] to-[#FDFBF7] border border-[#E8DCC4]">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border-2 border-[#D4C5A9]">
              <AvatarFallback className="bg-[#2D5A47] text-[#E8DCC4] text-sm font-medium">
                {getInitials(user.full_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#2D5A47] truncate">
                {user.full_name || "Navigator"}
              </p>
              <p className="text-xs text-[#8B9A8F] truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed user avatar */}
      {collapsed && !mobile && user && (
        <div className="mb-4 flex justify-center">
          <Avatar className="h-9 w-9 border-2 border-[#D4C5A9]">
            <AvatarFallback className="bg-[#2D5A47] text-[#E8DCC4] text-sm font-medium">
              {getInitials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Bottom actions */}
      <div className="space-y-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#5C7A6B] hover:bg-[#E8DCC4]/50 hover:text-[#2D5A47] transition-all duration-200",
                  collapsed && !mobile && "justify-center px-2"
                )}
              >
                <Settings className="h-4 w-4 transition-transform duration-200 group-hover:rotate-45" />
                {(!collapsed || mobile) && <span>Settings</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && !mobile && (
              <TooltipContent side="right" className="bg-[#1E3D32] text-[#E8DCC4] border-none">
                Settings
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#5C7A6B] hover:bg-[#E8DCC4]/50 hover:text-[#2D5A47] transition-all duration-200 w-full",
                  collapsed && !mobile && "justify-center px-2"
                )}
              >
                <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                {(!collapsed || mobile) && <span>Log out</span>}
              </button>
            </TooltipTrigger>
            {collapsed && !mobile && (
              <TooltipContent side="right" className="bg-[#1E3D32] text-[#E8DCC4] border-none">
                Log out
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FDFBF7]">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-[#E8DCC4] bg-gradient-to-b from-[#FDFBF7] via-[#F5F0E6] to-[#EDE5D4] transition-all duration-300 shadow-sm",
          collapsed ? "w-[72px]" : "w-72"
        )}
      >
        <NavContent />
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-4 border-b border-[#E8DCC4] px-4 h-14 bg-gradient-to-r from-[#FDFBF7] to-[#F5F0E6]">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[#2D5A47]">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-gradient-to-b from-[#FDFBF7] to-[#EDE5D4] border-r-[#E8DCC4]">
              <NavContent mobile />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#2D5A47]" />
            <span className="font-serif font-semibold text-[#1E3D32]">Chrononaut</span>
          </div>
          {/* Mobile AI Chat button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenChat}
            className="ml-auto text-[#2D5A47]"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-[#FDFBF7]">
          {children}
        </main>
      </div>
    </div>
  );
}
