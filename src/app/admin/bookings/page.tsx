"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  User,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  CalendarDays,
  Building2,
  ChevronDown,
  ChevronRight,
  DoorOpen,
} from "lucide-react";

interface AdminBooking {
  bookId: string;
  room: string;
  location: string;
  fromDate: string;
  toDate: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  status: string;
  created: string;
  patronType: string | null;
  patronStatus: string | null;
  classification: "valid" | "review" | "invalid" | "unknown";
}

const CLASSIFICATION_CONFIG = {
  valid: {
    label: "Valid Request",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    Icon: ShieldCheck,
  },
  review: {
    label: "Needs Review",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    Icon: ShieldQuestion,
  },
  invalid: {
    label: "Invalid Request",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    Icon: ShieldAlert,
  },
  unknown: {
    label: "—",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    Icon: ShieldQuestion,
  },
} as const;

const STATUS_BADGE: Record<string, string> = {
  "Mediated Tentative":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Mediated Approved":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Mediated Denied":
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  Confirmed:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

const TABS = [
  { key: "tentative", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "denied", label: "Denied" },
  { key: "all", label: "All" },
] as const;

function formatTimeRange(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  const dateStr = f.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = f.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = t.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateStr}, ${startTime} – ${endTime}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

export default function AdminBookingsPage() {
  const [grouped, setGrouped] = useState<Record<string, AdminBooking[]>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("tentative");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchBookings = useCallback(
    async (statusFilter: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/bookings?status=${statusFilter}&days=14`,
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load bookings");
        }
        const data = await res.json();
        setGrouped(data.grouped ?? {});
        setTotal(data.total ?? 0);
        setLastRefresh(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchBookings(tab);
  }, [tab, fetchBookings]);

  const locations = Object.keys(grouped).sort();
  const showClassification = tab === "tentative" || tab === "all";

  function groupByRoom(bookings: AdminBooking[]): [string, AdminBooking[]][] {
    const byRoom: Record<string, AdminBooking[]> = {};
    for (const b of bookings) {
      (byRoom[b.room] ??= []).push(b);
    }
    for (const arr of Object.values(byRoom)) {
      arr.sort((a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime());
    }
    const isInterview = (name: string) => /interview/i.test(name);
    return Object.entries(byRoom).sort(([a], [b]) => {
      const ai = isInterview(a);
      const bi = isInterview(b);
      if (ai && !bi) return -1;
      if (!ai && bi) return 1;
      return a.localeCompare(b);
    });
  }

  function toggleLocation(loc: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(loc)) next.delete(loc);
      else next.add(loc);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(locations));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1">
            {total} booking{total !== 1 ? "s" : ""} across {locations.length}{" "}
            location{locations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBookings(tab)}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 rounded-lg bg-muted p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6 text-center">
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fetchBookings(tab)}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-5 w-40 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Card key={j}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-64" />
                        </div>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && total === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No bookings found for this filter.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && total > 0 && (
        <div className="space-y-3">
          {/* Expand / Collapse all */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={expandAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Expand all
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              onClick={collapseAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Collapse all
            </button>
          </div>

          {locations.map((location) => {
            const isExpanded = expanded.has(location);
            const pendingCount = grouped[location].filter(
              (b) => b.status === "Mediated Tentative",
            ).length;

            return (
              <section key={location}>
                <button
                  onClick={() => toggleLocation(location)}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <h2 className="font-semibold text-sm flex-1">{location}</h2>
                  <Badge variant="secondary" className="text-xs">
                    {grouped[location].length}
                  </Badge>
                  {pendingCount > 0 && tab !== "tentative" && (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs border-0">
                      {pendingCount} pending
                    </Badge>
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-2 ml-6 space-y-4">
                    {groupByRoom(grouped[location]).map(([room, bookings]) => (
                      <div key={room}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <DoorOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {room}
                          </h3>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {bookings.length}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {bookings.map((booking) => {
                            const config =
                              CLASSIFICATION_CONFIG[booking.classification];
                            const StatusIcon = config.Icon;
                            const statusBadgeClass =
                              STATUS_BADGE[booking.status] ??
                              "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

                            return (
                              <Card key={booking.bookId}>
                                <CardContent className="py-3">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5 shrink-0" />
                                        {formatTimeRange(
                                          booking.fromDate,
                                          booking.toDate,
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 text-sm">
                                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span>
                                          {booking.firstName} {booking.lastName}
                                        </span>
                                        {booking.username && (
                                          <span className="text-muted-foreground">
                                            ({booking.username})
                                          </span>
                                        )}
                                      </div>

                                      {booking.patronType && (
                                        <p className="text-xs text-muted-foreground pl-5.5">
                                          Patron: {booking.patronType}
                                        </p>
                                      )}
                                      {booking.created && (
                                        <p className="text-xs text-muted-foreground pl-5.5">
                                          Submitted {formatDateTime(booking.created)}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
                                      <Badge
                                        className={`${statusBadgeClass} text-xs font-medium border-0`}
                                      >
                                        {booking.status}
                                      </Badge>

                                      {showClassification &&
                                        booking.status === "Mediated Tentative" && (
                                          <Badge
                                            className={`${config.className} gap-1 text-xs font-medium border-0`}
                                          >
                                            <StatusIcon className="h-3 w-3" />
                                            {config.label}
                                          </Badge>
                                        )}

                                      {booking.status === "Mediated Tentative" &&
                                        booking.classification === "valid" && (
                                          <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                            Approve in LibCal
                                          </span>
                                        )}
                                      {booking.status === "Mediated Tentative" &&
                                        booking.classification === "invalid" && (
                                          <span className="text-xs text-red-600 dark:text-red-400">
                                            Deny in LibCal
                                          </span>
                                        )}
                                      {booking.status === "Mediated Tentative" &&
                                        booking.classification === "review" && (
                                          <span className="text-xs text-amber-600 dark:text-amber-400">
                                            Verify in LibCal
                                          </span>
                                        )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
