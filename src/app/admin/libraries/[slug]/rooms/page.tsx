"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  X,
  Check,
  DoorOpen,
  Users,
} from "lucide-react";

interface Room {
  id: string;
  library_id: string;
  display_name: string;
  floor: string | null;
  capacity: number | null;
  is_reservable: boolean;
}

interface Library {
  id: string;
  slug: string;
  name: string;
}

export default function AdminRoomsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [library, setLibrary] = useState<Library | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addFloor, setAddFloor] = useState("");
  const [addCapacity, setAddCapacity] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const libRes = await fetch("/api/admin/libraries");
      if (!libRes.ok) throw new Error("Failed to load libraries");
      const libData = await libRes.json();
      const lib = (libData.libraries as Library[]).find(
        (l) => l.slug === slug,
      );
      if (!lib) {
        setError(`Library "${slug}" not found`);
        return;
      }
      setLibrary(lib);

      const roomRes = await fetch(
        `/api/admin/rooms?library_id=${lib.id}`,
      );
      if (!roomRes.ok) throw new Error("Failed to load rooms");
      const roomData = await roomRes.json();
      setRooms(roomData.rooms ?? []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!library) return;
    setAddError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          library_id: library.id,
          display_name: addName,
          floor: addFloor || null,
          capacity: addCapacity ? parseInt(addCapacity, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add");
        return;
      }
      setRooms((prev) =>
        [...prev, data.room].sort((a, b) =>
          a.display_name.localeCompare(b.display_name),
        ),
      );
      setShowAdd(false);
      setAddName("");
      setAddFloor("");
      setAddCapacity("");
    } catch {
      setAddError("Network error");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(room: Room) {
    setEditId(room.id);
    setEditName(room.display_name);
    setEditFloor(room.floor || "");
    setEditCapacity(room.capacity?.toString() || "");
  }

  async function handleSaveEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/rooms/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: editName,
          floor: editFloor || null,
          capacity: editCapacity ? parseInt(editCapacity, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save");
        return;
      }
      setRooms((prev) =>
        prev
          .map((r) => (r.id === editId ? data.room : r))
          .sort((a, b) => a.display_name.localeCompare(b.display_name)),
      );
      setEditId(null);
    } catch {
      alert("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete room "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/rooms/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
        return;
      }
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Network error");
    } finally {
      setDeleting(null);
    }
  }

  if (error) {
    return (
      <div>
        <Link
          href="/admin/libraries"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Libraries
        </Link>
        <Card className="border-destructive">
          <CardContent className="py-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/libraries"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Libraries
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {loading ? (
              <Skeleton className="h-7 w-48 inline-block" />
            ) : (
              <>Rooms — {library?.name}</>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {rooms.length} room{rooms.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAdd(true)}
          disabled={showAdd || loading}
        >
          <Plus className="h-4 w-4" />
          Add Room
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Name
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. WALC 3060"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={addFloor}
                    onChange={(e) => setAddFloor(e.target.value)}
                    placeholder="e.g. 3rd Floor"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={addCapacity}
                    onChange={(e) => setAddCapacity(e.target.value)}
                    placeholder="e.g. 8"
                    min="1"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-3">
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && rooms.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <DoorOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No rooms yet. Add one above.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && rooms.length > 0 && (
        <div className="space-y-2">
          {rooms.map((room) => {
            const isEditing = editId === room.id;
            const isDeleting = deleting === room.id;

            return (
              <Card key={room.id}>
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
                        value={editFloor}
                        onChange={(e) => setEditFloor(e.target.value)}
                        placeholder="Floor"
                        className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <input
                        type="number"
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                        placeholder="Cap"
                        min="1"
                        className="w-20 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        <DoorOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {room.display_name}
                        </span>
                        {room.floor && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {room.floor}
                          </Badge>
                        )}
                        {room.capacity && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Users className="h-3 w-3" />
                            {room.capacity}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEdit(room)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            handleDelete(room.id, room.display_name)
                          }
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
