"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full", mobile ? "p-4" : "p-3")}>
      {/* Logo */}
      <div className={cn("flex items-center gap-2 mb-6", collapsed && !mobile && "justify-center")}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">C</span>
        </div>
        {(!collapsed || mobile) && (
          <span className="font-semibold text-lg">Chrononaut</span>
        )}
      </div>

      {/* Quick Add Button */}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "mb-4 gap-2",
                collapsed && !mobile ? "w-10 h-10 p-0" : "w-full justify-start"
              )}
            >
              <Plus className="h-4 w-4" />
              {(!collapsed || mobile) && <span>Quick Task</span>}
              {(!collapsed || mobile) && (
                <kbd className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  ⌘T
                </kbd>
              )}
            </Button>
          </TooltipTrigger>
          {collapsed && !mobile && (
            <TooltipContent side="right">Quick Task (⌘T)</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
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
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      collapsed && !mobile && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {(!collapsed || mobile) && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {item.shortcut}
                        </kbd>
                      </>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && !mobile && (
                  <TooltipContent side="right">
                    {item.label} ({item.shortcut})
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      <Separator className="my-4" />

      {/* Bottom section */}
      <div className="space-y-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                  collapsed && !mobile && "justify-center px-2"
                )}
              >
                <Settings className="h-4 w-4" />
                {(!collapsed || mobile) && <span>Settings</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && !mobile && (
              <TooltipContent side="right">Settings</TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full",
                  collapsed && !mobile && "justify-center px-2"
                )}
              >
                <LogOut className="h-4 w-4" />
                {(!collapsed || mobile) && <span>Log out</span>}
              </button>
            </TooltipTrigger>
            {collapsed && !mobile && (
              <TooltipContent side="right">Log out</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Collapse button (desktop only) */}
      {!mobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="mt-4 w-full"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <NavContent />
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-4 border-b px-4 h-14 bg-card">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <NavContent mobile />
            </SheetContent>
          </Sheet>
          <span className="font-semibold">Chrononaut</span>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
