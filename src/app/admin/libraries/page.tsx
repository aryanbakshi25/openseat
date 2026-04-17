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

interface Library {
  id: string;
  slug: string;
  name: string;
  hours: unknown;
  created_at: string;
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
  }

  async function handleSaveEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/libraries/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, slug: editSlug }),
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
            Manage libraries displayed on OpenSeat
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={showAdd}>
          <Plus className="h-4 w-4" />
          Add Library
        </Button>
      </div>

      {/* Add form */}
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <input
                        type="text"
                        value={editSlug}
                        onChange={(e) =>
                          setEditSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, ""),
                          )
                        }
                        placeholder="Abbreviation"
                        className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={handleSaveEdit}
                          disabled={saving}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setEditId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <LibraryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {lib.name}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {lib.slug}
                        </Badge>
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
