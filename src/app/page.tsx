"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CrowdBadge } from "@/components/crowd-badge";
import type { Library, CrowdingData } from "@/lib/types";
import { MapPin, Users } from "lucide-react";

export default function HomePage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [crowding, setCrowding] = useState<Record<string, CrowdingData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/libraries");
        if (!res.ok) throw new Error("Failed to load libraries");
        const libs: Library[] = await res.json();
        setLibraries(libs);

        // Fetch crowding for all libraries in parallel
        const crowdResults = await Promise.allSettled(
          libs.map(async (lib) => {
            const r = await fetch(`/api/crowding?librarySlug=${lib.slug}`);
            if (!r.ok) return null;
            return r.json() as Promise<CrowdingData>;
          }),
        );

        const crowdMap: Record<string, CrowdingData> = {};
        crowdResults.forEach((result, i) => {
          if (result.status === "fulfilled" && result.value) {
            crowdMap[libs[i].slug] = result.value;
          }
        });
        setCrowding(crowdMap);
      } catch {
        setError("Could not load library data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Purdue Libraries</h1>
        <p className="text-muted-foreground mt-1">
          See real-time crowding and room availability
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))
          : libraries.map((lib) => {
              const data = crowding[lib.slug];
              return (
                <Link key={lib.id} href={`/libraries/${lib.slug}`}>
                  <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {lib.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data ? (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-semibold tabular-nums">
                              {data.overallPercent}%
                            </span>
                            <CrowdBadge level={data.level} />
                          </div>
                          {data.count != null && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              ~{data.count} people
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No data available
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
      </div>
    </div>
  );
}
