import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight mb-4">
        About OpenSeat
      </h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What is OpenSeat?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
            <p>
              OpenSeat is a web app built for Purdue students to quickly check
              open area crowding and study room availability across Purdue
              Libraries.
            </p>
            <p>
              The crowding data shows estimated occupancy levels for each library
              and its sub-areas (floors, zones, etc.), helping you find the
              quietest spot to study. Room availability shows which reservable
              study rooms are free right now or in the near future.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
            <p>
              Crowding levels are <strong>estimates</strong> based on sensor data
              and may not reflect exact real-time occupancy. Room availability is
              based on reservation system data and may not account for
              walk-in usage or last-minute cancellations.
            </p>
            <p>
              OpenSeat is not an official Purdue University application. It is
              developed as a PurdueTHINK consulting project in partnership with
              Purdue Libraries &amp; the School of Information Studies (Spring
              2026).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Sources</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Crowding:</strong> Real-time occupancy data via Occuspace
              </li>
              <li>
                <strong>Room Reservations:</strong> Live availability via LibCal
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
