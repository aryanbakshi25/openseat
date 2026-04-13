import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Lock } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          OpenSeat
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/about"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </Link>
          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Lock className="h-3 w-3" />
            Staff
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
