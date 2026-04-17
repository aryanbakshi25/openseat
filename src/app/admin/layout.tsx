"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Library,
  Lightbulb,
  Clock,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin/bookings", label: "Bookings", Icon: ClipboardList },
  { href: "/admin/libraries", label: "Libraries", Icon: Library },
  { href: "/admin/hours", label: "Hours", Icon: Clock },
  { href: "/admin/recommendations", label: "Recommendations", Icon: Lightbulb },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] -mx-4 -my-6">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-14 left-0 z-50 w-56 border-r bg-background transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="px-4 py-4 border-b">
            <h2 className="font-semibold text-sm tracking-tight">
              OpenSeat Admin
            </h2>
          </div>

          <nav className="flex-1 px-3 py-3 space-y-1">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t px-3 py-3 space-y-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to OpenSeat
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="sticky top-14 z-30 flex items-center gap-3 border-b bg-background px-4 py-2 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <span className="text-sm font-medium">Admin</span>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
