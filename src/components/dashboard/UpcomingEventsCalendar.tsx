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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, List, ChevronLeft, ChevronRight, Rocket, Radio, Share2 } from "lucide-react";
import { useUpcomingCampaignEvents, type CampaignEvent } from "@/hooks/useCampaigns";
import { useCreators } from "@/hooks/useCreators";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function buildGoogleCalendarUrl(event: CampaignEvent, guestEmail?: string): string {
  const dateCompact = event.date.slice(0, 10).replace(/-/g, "");
  const endDate = new Date(`${event.date.slice(0, 10)}T12:00:00`);
  endDate.setDate(endDate.getDate() + 1);
  const endDateCompact = endDate.toISOString().split("T")[0].replace(/-/g, "");
  const typeLabel = event.type === "launch" ? "Campaign Launch" : "Campaign Goes Live";
  const title = encodeURIComponent(`${event.brand} – ${typeLabel}`);
  const details = encodeURIComponent(
    `Creator: ${event.creatorName}\nCampaign status: ${event.campaignStatus}`
  );
  let url =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${title}&dates=${dateCompact}/${endDateCompact}&details=${details}`;
  if (guestEmail) url += `&add=${encodeURIComponent(guestEmail)}`;
  return url;
}

function formatEventDate(iso: string): { day: string; month: string; weekday: string } {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
  };
}

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

// ─── Share control (shared between both views) ─────────────────────────────────

function ShareControl({
  event,
  creators,
  shareTargets,
  setShareTargets,
  onShare,
}: {
  event: CampaignEvent;
  creators: { id: string; name: string; email: string | null }[];
  shareTargets: Record<string, string>;
  setShareTargets: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onShare: (event: CampaignEvent) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {creators.length > 0 && (
        <Select
          value={shareTargets[event.id] ?? "__default__"}
          onValueChange={(v) =>
            setShareTargets((prev) => ({ ...prev, [event.id]: v === "__default__" ? "" : v }))
          }
        >
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue placeholder="Creator (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">{event.creatorName} (default)</SelectItem>
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
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onShare(event)}>
            <Share2 className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share to Google Calendar</TooltipContent>
      </Tooltip>
    </div>
  );
}

// ─── Calendar grid view ────────────────────────────────────────────────────────

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CalendarGrid({
  events,
  creators,
  shareTargets,
  setShareTargets,
  onShare,
}: {
  events: CampaignEvent[];
  creators: { id: string; name: string; email: string | null }[];
  shareTargets: Record<string, string>;
  setShareTargets: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onShare: (event: CampaignEvent) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  // Build grid cells: pad so grid starts on Monday
  const firstDay = new Date(year, month, 1);
  // getDay() returns 0=Sun..6=Sat; we want 0=Mon..6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  // Map "YYYY-MM-DD" → events on that day
  const eventsByDate = new Map<string, CampaignEvent[]>();
  for (const ev of events) {
    const d = new Date(`${ev.date}T12:00:00`);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = ev.date.slice(0, 10);
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)!.push(ev);
    }
  }

  const todayIso = today.toISOString().slice(0, 10);

  return (
    <div className="pt-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {Array.from({ length: totalCells }).map((_, idx) => {
          const dayNum = idx - startOffset + 1;
          const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const isoDate = isCurrentMonth
            ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
            : null;
          const dayEvents = isoDate ? (eventsByDate.get(isoDate) ?? []) : [];
          const isToday = isoDate === todayIso;

          return (
            <div
              key={idx}
              className={cn(
                "bg-background min-h-[72px] p-1.5 flex flex-col",
                !isCurrentMonth && "bg-muted/30",
              )}
            >
              {isCurrentMonth && (
                <>
                  <span
                    className={cn(
                      "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1 self-end",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground",
                    )}
                  >
                    {dayNum}
                  </span>
                  <div className="flex flex-col gap-0.5 flex-1">
                    {dayEvents.map((ev) => {
                      const isLaunch = ev.type === "launch";
                      return (
                        <Popover key={ev.id}>
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                "w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate font-medium",
                                isLaunch
                                  ? "bg-primary/15 text-primary hover:bg-primary/25"
                                  : "bg-secondary/60 text-secondary-foreground hover:bg-secondary/80",
                              )}
                            >
                              <span className="mr-0.5">{isLaunch ? "🚀" : "📡"}</span>
                              {ev.brand}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-3" side="top">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{ev.brand}</span>
                                <Badge
                                  variant={isLaunch ? "default" : "secondary"}
                                  className="text-[10px] px-1.5 py-0 h-4"
                                >
                                  {isLaunch ? (
                                    <><Rocket className="w-2.5 h-2.5 mr-1" />Launch</>
                                  ) : (
                                    <><Radio className="w-2.5 h-2.5 mr-1" />Live</>
                                  )}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{ev.creatorName}</p>
                              <ShareControl
                                event={ev}
                                creators={creators}
                                shareTargets={shareTargets}
                                setShareTargets={setShareTargets}
                                onShare={onShare}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function UpcomingEventsCalendar() {
  const { data: events, isLoading } = useUpcomingCampaignEvents();
  const { data: creators } = useCreators(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [shareTargets, setShareTargets] = useState<Record<string, string>>({});

  const creatorList = (creators ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
  }));

  const handleShare = (event: CampaignEvent) => {
    const creatorId = shareTargets[event.id];
    let guestEmail: string | undefined;
    if (creatorId) {
      const creator = creatorList.find((c) => c.id === creatorId);
      guestEmail = creator?.email ?? undefined;
      if (!guestEmail) {
        toast.error(`${creator?.name ?? "Creator"} has no email address on file.`);
        return;
      }
    } else if (event.creatorEmail) {
      guestEmail = event.creatorEmail;
    }
    window.open(buildGoogleCalendarUrl(event, guestEmail), "_blank", "noopener,noreferrer");
  };

  const grouped = groupByMonth(events ?? []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            Upcoming Events
          </CardTitle>
          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-muted/40">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-7 w-7", view === "list" && "bg-background shadow-sm")}
                  onClick={() => setView("list")}
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>List view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-7 w-7", view === "calendar" && "bg-background shadow-sm")}
                  onClick={() => setView("calendar")}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Calendar view</TooltipContent>
            </Tooltip>
          </div>
        </div>
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
        ) : view === "calendar" ? (
          <CalendarGrid
            events={events}
            creators={creatorList}
            shareTargets={shareTargets}
            setShareTargets={setShareTargets}
            onShare={handleShare}
          />
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
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs text-primary font-medium leading-none">{month}</span>
                          <span className="text-lg font-bold text-primary leading-tight">{day}</span>
                          <span className="text-[10px] text-muted-foreground leading-none">{weekday}</span>
                        </div>
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
                        <ShareControl
                          event={event}
                          creators={creatorList}
                          shareTargets={shareTargets}
                          setShareTargets={setShareTargets}
                          onShare={handleShare}
                        />
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

