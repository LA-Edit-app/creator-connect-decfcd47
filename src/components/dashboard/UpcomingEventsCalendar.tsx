import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarDays, Rocket, Radio, Share2 } from "lucide-react";
import { useUpcomingCampaignEvents, type CampaignEvent } from "@/hooks/useCampaigns";
import { useCreators } from "@/hooks/useCreators";
import { toast } from "sonner";

// Build a Google Calendar "Create Event" URL for a campaign event
function buildGoogleCalendarUrl(event: CampaignEvent, guestEmail?: string): string {
  // Convert ISO date to YYYYMMDD for all-day events
  const dateCompact = event.date.replace(/-/g, "");
  // Google Calendar end date for all-day is exclusive (next day)
  const endDate = new Date(event.date);
  endDate.setDate(endDate.getDate() + 1);
  const endDateCompact = endDate.toISOString().split("T")[0].replace(/-/g, "");

  const typeLabel = event.type === "launch" ? "Campaign Launch" : "Campaign Goes Live";
  const title = encodeURIComponent(`${event.brand} – ${typeLabel}`);
  const details = encodeURIComponent(
    `Creator: ${event.creatorName}\nCampaign status: ${event.campaignStatus}`
  );

  let url =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${title}` +
    `&dates=${dateCompact}/${endDateCompact}` +
    `&details=${details}`;

  if (guestEmail) {
    url += `&add=${encodeURIComponent(guestEmail)}`;
  }

  return url;
}

// Format ISO date to a readable string
function formatEventDate(iso: string): { day: string; month: string; weekday: string } {
  const d = new Date(`${iso}T12:00:00`); // noon to avoid timezone offset issues
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
  };
}

// Group events by month label
function groupByMonth(events: CampaignEvent[]): { label: string; events: CampaignEvent[] }[] {
  const map = new Map<string, CampaignEvent[]>();
  for (const ev of events) {
    const d = new Date(`${ev.date}T12:00:00`);
    const label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(ev);
  }
  return Array.from(map.entries()).map(([label, events]) => ({ label, events }));
}

export function UpcomingEventsCalendar() {
  const { data: events, isLoading } = useUpcomingCampaignEvents();
  const { data: creators } = useCreators(false);

  // creatorId to share with, keyed by event id
  const [shareTargets, setShareTargets] = useState<Record<string, string>>({});

  const handleShare = (event: CampaignEvent) => {
    const creatorId = shareTargets[event.id];
    let guestEmail: string | undefined;

    if (creatorId) {
      const creator = creators?.find((c) => c.id === creatorId);
      guestEmail = creator?.email ?? undefined;
      if (!guestEmail) {
        toast.error(`${creator?.name ?? "Creator"} has no email address on file.`);
        return;
      }
    } else if (event.creatorEmail) {
      // Default to the campaign's own creator
      guestEmail = event.creatorEmail;
    }

    const url = buildGoogleCalendarUrl(event, guestEmail);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const grouped = groupByMonth(events ?? []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No upcoming campaign events
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {grouped.map(({ label, events: monthEvents }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {label}
                </p>
                <div className="space-y-2">
                  {monthEvents.map((event) => {
                    const { day, month, weekday } = formatEventDate(event.date);
                    const isLaunch = event.type === "launch";

                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors"
                      >
                        {/* Date badge */}
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs text-primary font-medium leading-none">{month}</span>
                          <span className="text-lg font-bold text-primary leading-tight">{day}</span>
                          <span className="text-[10px] text-muted-foreground leading-none">{weekday}</span>
                        </div>

                        {/* Event info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">{event.brand}</span>
                            <Badge
                              variant={isLaunch ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                            >
                              {isLaunch ? (
                                <><Rocket className="w-2.5 h-2.5 mr-1" />Launch</>
                              ) : (
                                <><Radio className="w-2.5 h-2.5 mr-1" />Live</>
                              )}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.creatorName}</p>
                        </div>

                        {/* Share to Google Calendar */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {creators && creators.length > 0 && (
                            <Select
                              value={shareTargets[event.id] ?? "__default__"}
                              onValueChange={(v) =>
                                setShareTargets((prev) => ({
                                  ...prev,
                                  [event.id]: v === "__default__" ? "" : v,
                                }))
                              }
                            >
                              <SelectTrigger className="h-7 w-36 text-xs">
                                <SelectValue placeholder="Creator (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__default__">
                                  {event.creatorName} (default)
                                </SelectItem>
                                {creators
                                  .filter((c) => c.email)
                                  .map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleShare(event)}
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share to Google Calendar</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
