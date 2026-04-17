"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CrowdBadge } from "@/components/crowd-badge";
import { ArrowLeft, Clock, Users, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import type { CrowdingData, AvailabilityData, SubAreaCrowding, RoomAvailability, Library, WeekSchedule } from "@/lib/types";
import { DAY_LABELS_FULL, formatDaySchedule, getTodaySchedule } from "@/lib/utils";

const TIME_WINDOWS = [
  { label: "Now", offsetMinutes: 0 },
  { label: "+30 min", offsetMinutes: 30 },
  { label: "+1 hr", offsetMinutes: 60 },
  { label: "+2 hr", offsetMinutes: 120 },
] as const;

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

const SECONDARY_LOCATION_IDS: Record<string, { ids: number[]; label: string }> = {
  walc: { ids: [17792], label: "Knowledge Lab (WALC 3007)" },
};

function RoomCard({ room }: { room: RoomAvailability }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{room.displayName}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              {room.floor && <span>{room.floor}</span>}
              {room.capacity && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {room.capacity}
                </span>
              )}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <Badge
                variant="secondary"
                className={
                  room.isAvailable
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                }
              >
                {room.isAvailable ? "Available" : "Reserved"}
              </Badge>
              {room.nextChangeAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {room.isAvailable ? "Until" : "Free at"}{" "}
                  {formatTime(room.nextChangeAt)}
                </p>
              )}
            </div>
            {room.bookingUrl && (
              <a href={room.bookingUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="shrink-0">
                  Book
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </a>
            )}
          </div>
          {/* Mobile: badge only */}
          <div className="sm:hidden text-right">
            <Badge
              variant="secondary"
              className={
                room.isAvailable
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
              }
            >
              {room.isAvailable ? "Available" : "Reserved"}
            </Badge>
            {room.nextChangeAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {room.isAvailable ? "Until" : "Free at"}{" "}
                {formatTime(room.nextChangeAt)}
              </p>
            )}
          </div>
        </div>
        {/* Mobile: book button centered at bottom */}
        {room.bookingUrl && (
          <div className="sm:hidden mt-3 flex justify-center">
            <a href={room.bookingUrl} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button variant="outline" className="w-full h-10 text-sm">
                Book
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoomList({ rooms, librarySlug }: { rooms: RoomAvailability[]; librarySlug: string }) {
  const secondary = SECONDARY_LOCATION_IDS[librarySlug];
  const secondaryIds = new Set(secondary?.ids ?? []);

  const mainRooms = secondary
    ? rooms.filter((r) => !r.locationId || !secondaryIds.has(r.locationId))
    : rooms;
  const secondaryRooms = secondary
    ? rooms.filter((r) => r.locationId && secondaryIds.has(r.locationId))
    : [];

  return (
    <div className="space-y-3">
      {mainRooms.map((room) => (
        <RoomCard key={room.roomId} room={room} />
      ))}

      {secondaryRooms.length > 0 && (
        <>
          <div className="pt-4 pb-1">
            <h3 className="text-sm font-semibold text-muted-foreground">{secondary!.label}</h3>
          </div>
          {secondaryRooms.map((room) => (
            <RoomCard key={room.roomId} room={room} />
          ))}
        </>
      )}
    </div>
  );
}

function HoursTable({ hours }: { hours: WeekSchedule }) {
  const today = new Date().getDay();
  return (
    <div className="rounded-lg border overflow-hidden">
      {DAY_LABELS_FULL.map((dayName, i) => {
        const ds = hours[i];
        const isToday = i === today;
        return (
          <div
            key={dayName}
            className={`flex items-center justify-between px-4 py-2.5 border-b last:border-0 ${
              isToday ? "bg-accent/50 font-medium" : ""
            }`}
          >
            <span className="text-sm">
              {dayName}
              {isToday && (
                <span className="text-xs text-muted-foreground ml-1.5">(Today)</span>
              )}
            </span>
            <span className={`text-sm ${ds ? "" : "text-muted-foreground italic"}`}>
              {formatDaySchedule(ds)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function LibraryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [library, setLibrary] = useState<Library | null>(null);
  const [crowding, setCrowding] = useState<CrowdingData | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(
    null,
  );
  const [selectedWindow, setSelectedWindow] = useState(0);
  const [loadingCrowd, setLoadingCrowd] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsFetchId, setRoomsFetchId] = useState(0);

  const libraryName = library?.name ?? slug.toUpperCase();

  useEffect(() => {
    fetch("/api/libraries")
      .then((r) => (r.ok ? r.json() : []))
      .then((libs: Library[]) => {
        const match = libs.find((l) => l.slug === slug);
        if (match) setLibrary(match);
      })
      .catch(() => {});

    fetch(`/api/crowding?librarySlug=${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setCrowding)
      .catch(() => {})
      .finally(() => setLoadingCrowd(false));
  }, [slug]);

  const handleWindowChange = (i: number) => {
    setSelectedWindow(i);
    setLoadingRooms(true);
    setAvailability(null);
    setRoomsFetchId((prev) => prev + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const offset = TIME_WINDOWS[selectedWindow].offsetMinutes;
    const start = new Date(Date.now() + offset * 60_000);
    const end = new Date(start.getTime() + 60 * 60_000);

    fetch(
      `/api/availability?librarySlug=${slug}&startISO=${start.toISOString()}&endISO=${end.toISOString()}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setAvailability(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingRooms(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, roomsFetchId]);

  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

  function toggleFloor(name: string) {
    setExpandedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Find lowest crowding sub-area (check children too)
  const allAreas: SubAreaCrowding[] = [];
  for (const area of crowding?.subAreas ?? []) {
    if (area.children && area.children.length > 0) {
      allAreas.push(...area.children);
    } else {
      allAreas.push(area);
    }
  }
  const bestArea = allAreas.length > 0
    ? allAreas.reduce((a, b) => (a.occupancyPercent < b.occupancyPercent ? a : b))
    : undefined;

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All Libraries
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{libraryName}</h1>
        {loadingCrowd ? (
          <Skeleton className="h-6 w-32 mt-2" />
        ) : crowding ? (
          <div className="flex items-center gap-3 mt-2">
            <span className="text-3xl font-bold tabular-nums">
              {crowding.overallPercent}%
            </span>
            <CrowdBadge level={crowding.level} />
            {crowding.count != null && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                ~{crowding.count}
              </span>
            )}
          </div>
        ) : null}
        {library?.hours && (
          <p className={`text-sm mt-2 flex items-center gap-1.5 ${
            getTodaySchedule(library.hours).isOpen
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          }`}>
            <Clock className="h-3.5 w-3.5" />
            {getTodaySchedule(library.hours).label}
          </p>
        )}
      </div>

      <Tabs defaultValue="crowding">
        <TabsList>
          <TabsTrigger value="crowding">Crowding</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
        </TabsList>

        {/* ── Crowding Tab ── */}
        <TabsContent value="crowding" className="mt-4">
          {loadingCrowd ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : crowding ? (
            <div className="space-y-3">
              {crowding.subAreas.map((area) => {
                const hasChildren = area.children && area.children.length > 0;
                const isFloorExpanded = expandedFloors.has(area.name);

                return (
                  <div key={area.name}>
                    <Card>
                      <CardContent className="py-0">
                        <button
                          onClick={() => hasChildren && toggleFloor(area.name)}
                          className={`w-full flex items-center justify-between py-4 ${hasChildren ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <div className="flex items-center gap-2">
                            {hasChildren && (
                              isFloorExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{area.name}</span>
                            {area.count != null && (
                              <span className="text-xs text-muted-foreground">
                                ~{area.count}
                              </span>
                            )}
                            {hasChildren && !isFloorExpanded && (
                              <span className="text-xs text-muted-foreground">
                                ({area.children!.length} areas)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold tabular-nums">
                              {area.occupancyPercent}%
                            </span>
                            <CrowdBadge level={area.level} />
                          </div>
                        </button>
                      </CardContent>
                    </Card>

                    {/* Sub-areas within this floor */}
                    {hasChildren && isFloorExpanded && (
                      <div className="ml-6 mt-1.5 space-y-1.5">
                        {area.children!.map((child) => (
                          <Card key={child.name} className="border-dashed">
                            <CardContent className="flex items-center justify-between py-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">{child.name}</span>
                                {bestArea?.name === child.name && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs"
                                  >
                                    Least busy
                                  </Badge>
                                )}
                                {child.count != null && (
                                  <span className="text-xs text-muted-foreground">
                                    ~{child.count}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold tabular-nums">
                                  {child.occupancyPercent}%
                                </span>
                                <CrowdBadge level={child.level} />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <p className="text-xs text-muted-foreground mt-4">
                <Clock className="inline h-3 w-3 mr-1" />
                Last updated:{" "}
                {new Date(crowding.lastUpdated).toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">No crowding data available.</p>
          )}
        </TabsContent>

        {/* ── Rooms Tab ── */}
        <TabsContent value="rooms" className="mt-4">
          {/* Time window selector */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {TIME_WINDOWS.map((tw, i) => (
              <Button
                key={tw.label}
                variant={selectedWindow === i ? "default" : "outline"}
                size="sm"
                onClick={() => handleWindowChange(i)}
              >
                {tw.label}
              </Button>
            ))}
          </div>

          {loadingRooms ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : availability?.rooms && availability.rooms.length > 0 ? (
            <RoomList rooms={availability.rooms} librarySlug={slug} />
          ) : (
            <p className="text-muted-foreground">
              No reservable rooms found for this library.
            </p>
          )}
        </TabsContent>

        {/* ── Hours Tab ── */}
        <TabsContent value="hours" className="mt-4">
          {library?.hours ? (
            <HoursTable hours={library.hours} />
          ) : (
            <p className="text-muted-foreground">Hours not available.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
