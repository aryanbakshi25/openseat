"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Clock,
  Sunrise,
  CalendarOff,
  TrendingDown,
  Database,
  RefreshCw,
  BarChart3,
} from "lucide-react";

interface HourlyAvg {
  hour: number;
  avgPercent: number;
  avgCount: number;
  samples: number;
}

interface Recommendation {
  id: string;
  type: "close_early" | "open_later" | "low_traffic_day" | "low_traffic_period";
  library: string;
  title: string;
  summary: string;
  reasoning: string;
  confidence: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  data: {
    dayOfWeek?: number;
    dayName?: string;
    suggestedHour?: number;
    hourlyBreakdown?: HourlyAvg[];
    avgPercent?: number;
  };
}

interface RecommendationsResponse {
  status: "collecting" | "ready";
  message?: string;
  snapshotCount: number;
  daysCovered: number;
  firstDate: string | null;
  lastDate: string | null;
  recommendations: Recommendation[];
}

const TYPE_CONFIG = {
  close_early: {
    Icon: Clock,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  },
  open_later: {
    Icon: Sunrise,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  low_traffic_day: {
    Icon: CalendarOff,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
  low_traffic_period: {
    Icon: TrendingDown,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
};

const CONFIDENCE_BADGE = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const IMPACT_BADGE = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function HourlyChart({ data }: { data: HourlyAvg[] }) {
  const maxPct = Math.max(...data.map((d) => d.avgPercent), 10);

  return (
    <div className="mt-3 overflow-x-auto -mx-2 px-2">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Hourly Occupancy Breakdown
      </p>
      <div className="flex items-end gap-1 h-20 min-w-0" style={{ minWidth: `${data.length * 28}px` }}>
        {data.map((d) => {
          const height = Math.max((d.avgPercent / maxPct) * 100, 4);
          const isLow = d.avgPercent <= 5;
          return (
            <div
              key={d.hour}
              className="flex-1 flex flex-col items-center gap-0.5 min-w-[24px]"
              title={`${formatHour(d.hour)}: ${d.avgPercent}% (${d.samples} samples)`}
            >
              <span className="text-[9px] text-muted-foreground tabular-nums">
                {d.avgPercent}%
              </span>
              <div
                className={`w-full rounded-t ${isLow ? "bg-red-300 dark:bg-red-600" : "bg-primary/30"}`}
                style={{ height: `${height}%` }}
              />
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                {formatHour(d.hour)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedLibs, setCollapsedLibs] = useState<Set<string> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/recommendations");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to load");
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (data?.recommendations && collapsedLibs === null) {
      const libs = new Set(data.recommendations.map((r) => r.library));
      setCollapsedLibs(libs);
    }
  }, [data, collapsedLibs]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleLibCollapse(lib: string) {
    setCollapsedLibs((prev) => {
      const base = prev ?? new Set(groupedByLibrary.map((g) => g.library));
      const next = new Set(base);
      if (next.has(lib)) next.delete(lib);
      else next.add(lib);
      return next;
    });
  }

  const groupedByLibrary = (() => {
    if (!data?.recommendations) return [];
    const map = new Map<string, Recommendation[]>();
    for (const rec of data.recommendations) {
      const existing = map.get(rec.library) ?? [];
      existing.push(rec);
      map.set(rec.library, existing);
    }
    return Array.from(map.entries()).map(([library, recs]) => ({ library, recs }));
  })();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hours Recommendations
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered suggestions based on historical occupancy data
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Data collection status */}
      {data && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Data Collection Status</p>
                <p className="text-xs text-muted-foreground">
                  {data.snapshotCount.toLocaleString()} snapshots over{" "}
                  {data.daysCovered} day{data.daysCovered !== 1 ? "s" : ""}
                  {data.firstDate && (
                    <>
                      {" "}
                      (since{" "}
                      {new Date(data.firstDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      )
                    </>
                  )}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  data.status === "ready"
                    ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                    : "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                }
              >
                {data.status === "ready" ? "Active" : "Collecting"}
              </Badge>
            </div>
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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-96" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && data?.status === "collecting" && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium mb-1">Gathering Data</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {data.message ||
                "The system is collecting occupancy data. Recommendations will appear once enough data has been gathered (at least 2 days of snapshots)."}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Snapshots are taken every 30 minutes. More data = better
              recommendations.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading &&
        data?.status === "ready" &&
        data.recommendations.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium mb-1">No Recommendations</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Current operating hours look well-aligned with actual usage
                patterns. No changes suggested at this time.
              </p>
            </CardContent>
          </Card>
        )}

      {!loading && groupedByLibrary.length > 0 && (
        <div className="space-y-4">
          {/* Expand / Collapse all */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setCollapsedLibs(new Set())}
              disabled={collapsedLibs !== null && collapsedLibs.size === 0}
            >
              Expand all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() =>
                setCollapsedLibs(new Set(groupedByLibrary.map((g) => g.library)))
              }
              disabled={collapsedLibs === null || collapsedLibs.size === groupedByLibrary.length}
            >
              Collapse all
            </Button>
          </div>

          {groupedByLibrary.map(({ library, recs }) => {
            const isCollapsed = collapsedLibs === null || collapsedLibs.has(library);
            return (
              <div key={library}>
                <button
                  onClick={() => toggleLibCollapse(library)}
                  className="flex items-center gap-2 w-full text-left mb-2 group"
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h2 className="font-semibold text-base group-hover:text-primary transition-colors">
                    {library}
                  </h2>
                  <Badge variant="outline" className="text-[10px]">
                    {recs.length} recommendation{recs.length !== 1 ? "s" : ""}
                  </Badge>
                </button>

                {!isCollapsed && (
                  <div className="space-y-3 ml-0 sm:ml-6">
                    {recs.map((rec) => {
                      const config = TYPE_CONFIG[rec.type];
                      const TypeIcon = config.Icon;
                      const isExpanded = expanded.has(rec.id);

                      return (
                        <Card key={rec.id} className={`${config.bg} border`}>
                          <CardContent className="py-4">
                            <div className="space-y-2">
                              {/* Header */}
                              <div className="flex items-start gap-3">
                                <TypeIcon
                                  className={`h-5 w-5 mt-0.5 shrink-0 ${config.color}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                                    <div className="min-w-0">
                                      <h3 className="font-semibold text-sm">
                                        {rec.title}
                                      </h3>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <Badge
                                        className={`${CONFIDENCE_BADGE[rec.confidence]} text-[10px] border-0`}
                                      >
                                        {rec.confidence} confidence
                                      </Badge>
                                      <Badge
                                        className={`${IMPACT_BADGE[rec.impact]} text-[10px] border-0`}
                                      >
                                        {rec.impact} impact
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Summary */}
                              <p className="text-sm text-foreground/80 pl-0 sm:pl-8">
                                {rec.summary}
                              </p>

                              {/* Expand button */}
                              <button
                                onClick={() => toggleExpand(rec.id)}
                                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors pl-0 sm:pl-8"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                    Hide details
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                    See full reasoning
                                  </>
                                )}
                              </button>

                              {/* Expanded reasoning */}
                              {isExpanded && (
                                <div className="pl-0 sm:pl-8 pt-2 border-t border-border/50 mt-2 space-y-3 overflow-hidden">
                                  <p className="text-sm text-foreground/70 leading-relaxed break-words">
                                    {rec.reasoning}
                                  </p>
                                  {rec.data.hourlyBreakdown &&
                                    rec.data.hourlyBreakdown.length > 0 && (
                                      <HourlyChart data={rec.data.hourlyBreakdown} />
                                    )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
