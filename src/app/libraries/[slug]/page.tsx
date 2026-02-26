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
import { ArrowLeft, Clock, Users } from "lucide-react";
import type { CrowdingData, AvailabilityData } from "@/lib/types";

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

export default function LibraryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [crowding, setCrowding] = useState<CrowdingData | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(
    null,
  );
  const [selectedWindow, setSelectedWindow] = useState(0);
  const [loadingCrowd, setLoadingCrowd] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsFetchId, setRoomsFetchId] = useState(0);

  const libraryName = slug.toUpperCase();

  useEffect(() => {
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

  // Find lowest crowding sub-area
  const bestArea = crowding?.subAreas.reduce((a, b) =>
    a.occupancyPercent < b.occupancyPercent ? a : b,
  );

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
      </div>

      <Tabs defaultValue="crowding">
        <TabsList>
          <TabsTrigger value="crowding">Crowding</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
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
              {crowding.subAreas.map((area) => (
                <Card key={area.name}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{area.name}</span>
                      {bestArea?.name === area.name && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                        >
                          Best area
                        </Badge>
                      )}
                      {area.count != null && (
                        <span className="text-xs text-muted-foreground">
                          ~{area.count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold tabular-nums">
                        {area.occupancyPercent}%
                      </span>
                      <CrowdBadge level={area.level} />
                    </div>
                  </CardContent>
                </Card>
              ))}

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
            <div className="space-y-3">
              {availability.rooms.map((room) => (
                <Card key={room.roomId}>
                  <CardContent className="flex items-center justify-between py-4">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No reservable rooms found for this library.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
