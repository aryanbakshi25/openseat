"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  DoorOpen,
  X,
  Check,
  Library as LibraryIcon,
} from "lucide-react";
import type { DaySchedule, WeekSchedule } from "@/lib/types";
import { DAY_LABELS, formatHourLabel, formatDaySchedule } from "@/lib/utils";

interface Library {
  id: string;
  slug: string;
  name: string;
  hours: WeekSchedule | null;
  created_at: string;
}

const HOUR_OPTIONS: number[] = Array.from({ length: 25 }, (_, i) => i);
const DEFAULT_SCHEDULE: WeekSchedule = [null, [8, 17], [8, 17], [8, 17], [8, 17], [8, 17], null];

function HoursSummary({ hours }: { hours: WeekSchedule | null }) {
  if (!hours) return <span className="text-xs text-muted-foreground italic">No hours set</span>;
  const today = new Date().getDay();
  const ds = hours[today];
  return (
    <span className="text-xs text-muted-foreground">
      Today: {formatDaySchedule(ds)}
    </span>
  );
}

export default function AdminLibrariesPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSlug, setAddSlug] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editHours, setEditHours] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchLibraries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/libraries");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setLibraries(data.libraries ?? []);
    } catch {
      setError("Failed to load libraries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/admin/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName, slug: addSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add");
        return;
      }
      setLibraries((prev) =>
        [...prev, data.library].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setShowAdd(false);
      setAddName("");
      setAddSlug("");
    } catch {
      setAddError("Network error");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(lib: Library) {
    setEditId(lib.id);
    setEditName(lib.name);
    setEditSlug(lib.slug);
    setEditHours(lib.hours ?? DEFAULT_SCHEDULE);
  }

  function updateEditDay(dayIdx: number, value: DaySchedule) {
    setEditHours((prev) => {
      const next = [...prev] as WeekSchedule;
      next[dayIdx] = value;
      return next;
    });
  }

  function toggleEditClosed(dayIdx: number) {
    const current = editHours[dayIdx];
    updateEditDay(dayIdx, current ? null : [8, 17]);
  }

  function setEditOpen(dayIdx: number, h: number) {
    const current = editHours[dayIdx];
    const close = current ? current[1] : 17;
    updateEditDay(dayIdx, [h, Math.max(h + 1, close)]);
  }

  function setEditClose(dayIdx: number, h: number) {
    const current = editHours[dayIdx];
    const open = current ? current[0] : 8;
    updateEditDay(dayIdx, [Math.min(open, h - 1), h]);
  }

  async function handleSaveEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/libraries/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, slug: editSlug, hours: editHours }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save");
        return;
      }
      setLibraries((prev) =>
        prev
          .map((l) => (l.id === editId ? data.library : l))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditId(null);
    } catch {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Delete "${name}"? This will also delete all rooms under it. This cannot be undone.`,
      )
    )
      return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/libraries/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
        return;
      }
      setLibraries((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert("Network error");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Libraries</h1>
          <p className="text-muted-foreground mt-1">
            Manage libraries and operating hours
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={showAdd}>
          <Plus className="h-4 w-4" />
          Add Library
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Name
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Library of Engineering and Science"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Abbreviation (short code for URLs)
                  </label>
                  <input
                    type="text"
                    value={addSlug}
                    onChange={(e) =>
                      setAddSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder="e.g. engr, walc, hsse"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </div>
              </div>
              {addError && (
                <p className="text-sm text-destructive">{addError}</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={adding}>
                  {adding ? "Adding..." : "Add"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAdd(false);
                    setAddError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {libraries.map((lib) => {
            const isEditing = editId === lib.id;
            const isDeleting = deleting === lib.id;

            return (
              <Card key={lib.id}>
                <CardContent className="py-3">
                  {isEditing ? (
                    <div className="space-y-4">
                      {/* Name + Slug row */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                        <div className="w-full sm:w-32">
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Abbreviation</label>
                          <input
                            type="text"
                            value={editSlug}
                            onChange={(e) =>
                              setEditSlug(
                                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                              )
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                      </div>

                      {/* Hours grid */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">
                          Operating Hours
                        </label>
                        <div className="space-y-1.5">
                          {DAY_LABELS.map((dayLabel, dayIdx) => {
                            const ds = editHours[dayIdx];
                            const isClosed = ds === null;
                            return (
                              <div
                                key={dayLabel}
                                className="flex items-center gap-2 sm:gap-3"
                              >
                                <span className="w-10 text-xs font-medium text-muted-foreground shrink-0">
                                  {dayLabel}
                                </span>
                                <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!isClosed}
                                    onChange={() => toggleEditClosed(dayIdx)}
                                    className="rounded border-input"
                                  />
                                  <span className="text-xs text-muted-foreground">Open</span>
                                </label>
                                {isClosed ? (
                                  <span className="text-xs text-muted-foreground italic">Closed</span>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value={ds[0]}
                                      onChange={(e) => setEditOpen(dayIdx, parseInt(e.target.value))}
                                      className="rounded-md border border-input bg-background px-1.5 py-0.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      {HOUR_OPTIONS.filter((h) => h < (ds[1] ?? 24)).map((h) => (
                                        <option key={h} value={h}>{formatHourLabel(h)}</option>
                                      ))}
                                    </select>
                                    <span className="text-xs text-muted-foreground">to</span>
                                    <select
                                      value={ds[1]}
                                      onChange={(e) => setEditClose(dayIdx, parseInt(e.target.value))}
                                      className="rounded-md border border-input bg-background px-1.5 py-0.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                      </div>

                      {/* Save / Cancel */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={saving}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-3">
                          <LibraryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {lib.name}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {lib.slug}
                          </Badge>
                        </div>
                        <div className="pl-7">
                          <HoursSummary hours={lib.hours} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/admin/libraries/${lib.slug}/rooms`}>
                          <Button variant="ghost" size="icon-xs" title="Manage rooms">
                            <DoorOpen className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEdit(lib)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(lib.id, lib.name)}
                          disabled={isDeleting}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
