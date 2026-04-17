"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, RefreshCw, Library as LibraryIcon } from "lucide-react";
import type { DaySchedule, WeekSchedule } from "@/lib/types";
import { DAY_LABELS, formatHourLabel } from "@/lib/utils";

interface LibraryRow {
  id: string;
  slug: string;
  name: string;
  hours: WeekSchedule | null;
}

const HOUR_OPTIONS: number[] = Array.from({ length: 25 }, (_, i) => i); // 0–24

const DEFAULT_SCHEDULE: WeekSchedule = [null, [8, 17], [8, 17], [8, 17], [8, 17], [8, 17], null];

export default function AdminHoursPage() {
  const [libraries, setLibraries] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, WeekSchedule>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const fetchLibraries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/libraries");
      if (!res.ok) return;
      const data = await res.json();
      const libs: LibraryRow[] = data.libraries ?? [];
      setLibraries(libs);
      const d: Record<string, WeekSchedule> = {};
      for (const lib of libs) {
        d[lib.id] = lib.hours ?? DEFAULT_SCHEDULE;
      }
      setDrafts(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  function updateDay(libId: string, dayIdx: number, value: DaySchedule) {
    setDrafts((prev) => {
      const schedule = [...(prev[libId] ?? DEFAULT_SCHEDULE)] as WeekSchedule;
      schedule[dayIdx] = value;
      return { ...prev, [libId]: schedule };
    });
    setSaved((prev) => {
      const next = new Set(prev);
      next.delete(libId);
      return next;
    });
  }

  function toggleClosed(libId: string, dayIdx: number) {
    const schedule = drafts[libId] ?? DEFAULT_SCHEDULE;
    const current = schedule[dayIdx];
    if (current) {
      updateDay(libId, dayIdx, null);
    } else {
      updateDay(libId, dayIdx, [8, 17]);
    }
  }

  function setOpenHour(libId: string, dayIdx: number, h: number) {
    const schedule = drafts[libId] ?? DEFAULT_SCHEDULE;
    const current = schedule[dayIdx];
    const close = current ? current[1] : 17;
    updateDay(libId, dayIdx, [h, Math.max(h + 1, close)]);
  }

  function setCloseHour(libId: string, dayIdx: number, h: number) {
    const schedule = drafts[libId] ?? DEFAULT_SCHEDULE;
    const current = schedule[dayIdx];
    const open = current ? current[0] : 8;
    updateDay(libId, dayIdx, [Math.min(open, h - 1), h]);
  }

  async function handleSave(lib: LibraryRow) {
    const schedule = drafts[lib.id];
    if (!schedule) return;
    setSaving((prev) => new Set(prev).add(lib.id));
    try {
      const res = await fetch(`/api/admin/libraries/${lib.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: schedule }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to save hours");
        return;
      }
      setLibraries((prev) =>
        prev.map((l) => (l.id === lib.id ? { ...l, hours: schedule } : l)),
      );
      setSaved((prev) => new Set(prev).add(lib.id));
    } catch {
      alert("Network error");
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(lib.id);
        return next;
      });
    }
  }

  function hasChanges(lib: LibraryRow): boolean {
    const draft = drafts[lib.id];
    const original = lib.hours ?? DEFAULT_SCHEDULE;
    return JSON.stringify(draft) !== JSON.stringify(original);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hours</h1>
          <p className="text-muted-foreground mt-1">
            Set weekly operating hours for each library
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLibraries} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-5 w-40 mb-4" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {libraries.map((lib) => {
            const schedule = drafts[lib.id] ?? DEFAULT_SCHEDULE;
            const isSaving = saving.has(lib.id);
            const isSaved = saved.has(lib.id);
            const changed = hasChanges(lib);

            return (
              <Card key={lib.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <LibraryIcon className="h-4 w-4 text-muted-foreground" />
                      <h2 className="font-semibold text-sm">{lib.name}</h2>
                      <Badge variant="outline" className="text-xs">{lib.slug}</Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSave(lib)}
                      disabled={isSaving || !changed}
                      className={isSaved && !changed ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      {isSaving ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : isSaved && !changed ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                      {isSaving ? "Saving..." : isSaved && !changed ? "Saved" : "Save"}
                    </Button>
                  </div>

                  {/* Schedule grid */}
                  <div className="space-y-2">
                    {DAY_LABELS.map((dayLabel, dayIdx) => {
                      const ds = schedule[dayIdx];
                      const isClosed = ds === null;

                      return (
                        <div
                          key={dayLabel}
                          className="flex items-center gap-2 sm:gap-4 py-1.5 border-b last:border-0"
                        >
                          <span className="w-10 text-sm font-medium text-muted-foreground shrink-0">
                            {dayLabel}
                          </span>

                          <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!isClosed}
                              onChange={() => toggleClosed(lib.id, dayIdx)}
                              className="rounded border-input"
                            />
                            <span className="text-xs text-muted-foreground">Open</span>
                          </label>

                          {isClosed ? (
                            <span className="text-sm text-muted-foreground italic">Closed</span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <select
                                value={ds[0]}
                                onChange={(e) => setOpenHour(lib.id, dayIdx, parseInt(e.target.value))}
                                className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {HOUR_OPTIONS.filter((h) => h < (ds[1] ?? 24)).map((h) => (
                                  <option key={h} value={h}>{formatHourLabel(h)}</option>
                                ))}
                              </select>
                              <span className="text-sm text-muted-foreground">to</span>
                              <select
                                value={ds[1]}
                                onChange={(e) => setCloseHour(lib.id, dayIdx, parseInt(e.target.value))}
                                className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {HOUR_OPTIONS.filter((h) => h > (ds[0] ?? 0)).map((h) => (
                                  <option key={h} value={h}>{formatHourLabel(h)}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
