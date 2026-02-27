import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { initialCampaignData, creators } from "@/data/campaignTrackerData";

interface CampaignEvent {
  id: number;
  brand: string;
  creatorName: string;
  activity: string;
  liveDate: Date;
  liveDateStr: string;
}

function parseLiveDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.toLowerCase().includes("tbc")) return null;

  const formats = [
    "dd MMM yyyy",
    "d MMM yyyy",
    "do MMM",
    "ddo MMM",
    "dd/MM/yyyy",
    "yyyy-MM-dd",
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr, fmt, new Date());
      if (!isNaN(parsed.getTime())) return parsed;
    } catch {
      continue;
    }
  }

  // Handle formats like "9th Nov", "11th Nov", "22nd Nov"
  const match = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)\s+(\w+)/i);
  if (match) {
    const [, day, month] = match;
    const year = new Date().getFullYear();
    const attempt = parse(`${day} ${month} ${year}`, "d MMM yyyy", new Date());
    if (!isNaN(attempt.getTime())) return attempt;
  }

  return null;
}

export function CampaignCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const campaignEvents = useMemo<CampaignEvent[]>(() => {
    return initialCampaignData
      .filter((c) => c.liveDate)
      .map((c) => {
        const parsed = parseLiveDate(c.liveDate);
        if (!parsed) return null;
        const creator = creators.find((cr) => cr.id === c.creatorId);
        return {
          id: c.id,
          brand: c.brand,
          creatorName: creator?.name ?? "Unknown",
          activity: c.activity,
          liveDate: parsed,
          liveDateStr: c.liveDate,
        };
      })
      .filter(Boolean) as CampaignEvent[];
  }, []);

  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    campaignEvents.forEach((e) => dates.add(format(e.liveDate, "yyyy-MM-dd")));
    return dates;
  }, [campaignEvents]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return campaignEvents.filter((e) => format(e.liveDate, "yyyy-MM-dd") === key);
  }, [selectedDate, campaignEvents]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Campaign Calendar</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-shrink-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className={cn("p-3 pointer-events-auto")}
              modifiers={{ hasEvent: (date) => eventDates.has(format(date, "yyyy-MM-dd")) }}
              modifiersClassNames={{
                hasEvent: "bg-primary/15 font-semibold text-primary",
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            {selectedDate ? (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  {format(selectedDate, "d MMMM yyyy")}
                </h4>
                {selectedEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-border p-3 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm">
                            {event.brand}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {event.creatorName}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {event.activity}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No campaigns going live on this date.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Upcoming
                </h4>
                <div className="space-y-3">
                  {campaignEvents
                    .sort((a, b) => a.liveDate.getTime() - b.liveDate.getTime())
                    .slice(0, 5)
                    .map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-border p-3 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm">
                            {event.brand}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {event.liveDateStr}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {event.activity}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
