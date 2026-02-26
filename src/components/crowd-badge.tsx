import { Badge } from "@/components/ui/badge";
import type { CrowdLevel } from "@/lib/types";

const VARIANTS: Record<CrowdLevel, string> = {
  "Not Busy": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Busy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  "Very Busy": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function CrowdBadge({ level }: { level: CrowdLevel }) {
  return (
    <Badge variant="secondary" className={VARIANTS[level]}>
      {level}
    </Badge>
  );
}
