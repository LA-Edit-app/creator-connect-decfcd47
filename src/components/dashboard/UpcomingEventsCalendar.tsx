import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import { CalendarDays, List, ChevronLeft, ChevronRight, Rocket, Radio, Share2, Plus, Edit2, Trash2 } from "lucide-react";
import { useAllCalendarEvents, type CampaignEvent } from "@/hooks/useCampaigns";
import { useCreators } from "@/hooks/useCreators";
import { useDeleteCustomEvent, type CalendarEvent } from "@/hooks/useCustomEvents";
import { AddCustomEventDialog } from "./AddCustomEventDialog";
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

function buildCustomEventGoogleCalendarUrl(event: CalendarEvent, guestEmail?: string): string {
  const eventDate = new Date(`${event.date}T${event.time || '12:00'}:00`);
  const eventDateStr = event.date.replace(/-/g, "");
  
  let endDateStr: string;
  if (event.all_day) {
    // For all-day events, end date is the next day
    const endDate = new Date(`${event.date}T12:00:00`);
    endDate.setDate(endDate.getDate() + 1);
    endDateStr = endDate.toISOString().split("T")[0].replace(/-/g, "");
  } else {
    // For timed events, add 1 hour duration
    const endTime = new Date(eventDate);
    endTime.setHours(endTime.getHours() + 1);
    endDateStr = endTime.toISOString().replace(/[-:]/g, "").slice(0, 13) + "00Z";
  }
  
  const dates = event.all_day 
    ? `${eventDateStr}/${endDateStr}`
    : `${eventDate.toISOString().replace(/[-:]/g, "").slice(0, 13)}00Z/${endDateStr}`;
  
  const title = encodeURIComponent(event.title);
  const details = event.description ? encodeURIComponent(event.description) : "";
  
  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}`;
  if (details) url += `&details=${details}`;
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

// ─── Custom Event Share control ─────────────────────────────────

function CustomEventShareControl({
  event,
  shareEmails,
  setShareEmails,
  onShare,
  size = "sm",
}: {
  event: CalendarEvent;
  shareEmails: Record<string, string>;
  setShareEmails: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onShare: (event: CalendarEvent, email?: string) => void;
  size?: "sm" | "md";
}) {
  const isSmall = size === "sm";
  
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Input
        type="email"
        placeholder="Email (optional)"
        value={shareEmails[event.id] ?? ""}
        onChange={(e) =>
          setShareEmails((prev) => ({ ...prev, [event.id]: e.target.value }))
        }
        className={cn(
          "text-xs",
          isSmall ? "h-7 w-36" : "h-8 w-40"
        )}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className={cn(isSmall ? "h-7 w-7" : "h-8 w-8")} 
            onClick={() => onShare(event, shareEmails[event.id] || undefined)}
          >
            <Share2 className={cn(isSmall ? "w-3.5 h-3.5" : "w-4 h-4")} />
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
  shareEmails,
  setShareEmails,
  onCustomEventShare,
}: {
  events: CalendarEvent[];
  creators: { id: string; name: string; email: string | null }[];
  shareTargets: Record<string, string>;
  setShareTargets: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onShare: (event: CampaignEvent) => void;
  shareEmails: Record<string, string>;
  setShareEmails: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onCustomEventShare: (event: CalendarEvent, email?: string) => void;
}) {
  const deleteCustomEvent = useDeleteCustomEvent();

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
  const eventsByDate = new Map<string, CalendarEvent[]>();
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
                "bg-background min-h-[72px] p-1.5 flex flex-col group hover:bg-muted/30 transition-colors",
                !isCurrentMonth && "bg-muted/30",
              )}
            >
              {isCurrentMonth && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {dayNum}
                    </span>
                    <AddCustomEventDialog defaultDate={isoDate!}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </AddCustomEventDialog>
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1">
                    {dayEvents.map((ev) => {
                      if (ev.type === "campaign") {
                        const isLaunch = ev.eventType === "launch";
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
                                  event={{
                                    id: ev.campaignId!,
                                    campaignId: ev.campaignId!,
                                    type: ev.eventType!,
                                    date: ev.date,
                                    brand: ev.brand!,
                                    creatorName: ev.creatorName!,
                                    creatorEmail: ev.creatorEmail!,
                                    campaignStatus: ev.campaignStatus!,
                                  } as CampaignEvent}
                                  creators={creators}
                                  shareTargets={shareTargets}
                                  setShareTargets={setShareTargets}
                                  onShare={onShare}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      } else {
                        // Custom event
                        return (
                          <Popover key={ev.id}>
                            <PopoverTrigger asChild>
                              <button
                                className="w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate font-medium"
                                style={{
                                  backgroundColor: `${ev.color}20`,
                                  color: ev.color,
                                  borderLeft: `3px solid ${ev.color}`,
                                }}
                              >
                                <span className="mr-0.5">📅</span>
                                {ev.title}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3" side="top">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: ev.color }}
                                    />
                                    <span className="font-semibold text-sm">{ev.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={async () => {
                                        try {
                                          await deleteCustomEvent.mutateAsync(ev.id);
                                          toast.success("Event deleted successfully");
                                        } catch (error: any) {
                                          toast.error(error.message || "Failed to delete event");
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                {ev.description && (
                                  <p className="text-xs text-muted-foreground">{ev.description}</p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {ev.all_day ? (
                                    <span>All day</span>
                                  ) : (
                                    <span>at {ev.time}</span>
                                  )}
                                </div>
                                <CustomEventShareControl
                                  event={ev}
                                  shareEmails={shareEmails}
                                  setShareEmails={setShareEmails}
                                  onShare={onCustomEventShare}
                                  size="sm"
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      }
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
  const { data: events, isLoading } = useAllCalendarEvents();
  const { data: creators } = useCreators(false);
  const deleteCustomEvent = useDeleteCustomEvent();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [shareTargets, setShareTargets] = useState<Record<string, string>>({});
  const [shareEmails, setShareEmails] = useState<Record<string, string>>({});

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

  const handleCustomEventShare = (event: CalendarEvent, email?: string) => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    window.open(buildCustomEventGoogleCalendarUrl(event, email), "_blank", "noopener,noreferrer");
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  // Group events by month for list view — exclude past events
  const campaignEvents = events
    ?.filter(e => e.type === "campaign" && e.date >= todayIso)
    .map(e => ({
      id: e.campaignId!,
      campaignId: e.campaignId!,
      type: e.eventType!,
      date: e.date,
      brand: e.brand!,
      creatorName: e.creatorName!,
      creatorEmail: e.creatorEmail!,
      campaignStatus: e.campaignStatus!,
    })) ?? [];

  // Group all events by month for mixed display — exclude past events
  const allEventsByMonth = useMemo(() => {
    if (!events) return [];

    const eventsByMonth = new Map<string, CalendarEvent[]>();

    events
      .filter(event => event.date >= todayIso)
      .forEach(event => {
        const date = new Date(`${event.date}T12:00:00`);
        const monthKey = date.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        });

        if (!eventsByMonth.has(monthKey)) {
          eventsByMonth.set(monthKey, []);
        }
        eventsByMonth.get(monthKey)!.push(event);
      });

    return Array.from(eventsByMonth.entries())
      .map(([label, events]) => ({ label, events: events.sort((a, b) => a.date.localeCompare(b.date)) }))
      .sort((a, b) => {
        const dateA = new Date(a.events[0].date);
        const dateB = new Date(b.events[0].date);
        return dateA.getTime() - dateB.getTime();
      });
  }, [events, todayIso]);

  const grouped = groupByMonth(campaignEvents);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              Calendar Events
            </CardTitle>
            <AddCustomEventDialog>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Add Event
              </Button>
            </AddCustomEventDialog>
          </div>
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
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">No events scheduled</p>
            <AddCustomEventDialog>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add your first event
              </Button>
            </AddCustomEventDialog>
          </div>
        ) : view === "calendar" ? (
          <CalendarGrid
            events={events}
            creators={creatorList}
            shareTargets={shareTargets}
            setShareTargets={setShareTargets}
            onShare={handleShare}
            shareEmails={shareEmails}
            setShareEmails={setShareEmails}
            onCustomEventShare={handleCustomEventShare}
          />
        ) : (
          <div className="space-y-6 pt-2">
            {allEventsByMonth.map(({ label, events: monthEvents }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {label}
                </p>
                <div className="space-y-2">
                  {monthEvents.map((event) => {
                    const { day, month, weekday } = formatEventDate(event.date);
                    
                    if (event.type === "campaign") {
                      const isLaunch = event.eventType === "launch";
                      const campaignEvent = {
                        id: event.campaignId!,
                        campaignId: event.campaignId!,
                        type: event.eventType!,
                        date: event.date,
                        brand: event.brand!,
                        creatorName: event.creatorName!,
                        creatorEmail: event.creatorEmail!,
                        campaignStatus: event.campaignStatus!,
                      } as CampaignEvent;
                      
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
                            event={campaignEvent}
                            creators={creatorList}
                            shareTargets={shareTargets}
                            setShareTargets={setShareTargets}
                            onShare={handleShare}
                          />
                        </div>
                      );
                    } else {
                      // Custom event
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors"
                        >
                          <div 
                            className="w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0"
                            style={{ backgroundColor: `${event.color}20` }}
                          >
                            <span className="text-xs font-medium leading-none" style={{ color: event.color }}>{month}</span>
                            <span className="text-lg font-bold leading-tight" style={{ color: event.color }}>{day}</span>
                            <span className="text-[10px] text-muted-foreground leading-none">{weekday}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                              <span className="text-sm font-medium text-foreground truncate">{event.title}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                Custom Event
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</p>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              {event.all_day ? (
                                <span>All day</span>
                              ) : (
                                <span>at {event.time}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <CustomEventShareControl
                              event={event}
                              shareEmails={shareEmails}
                              setShareEmails={setShareEmails}
                              onShare={handleCustomEventShare}
                              size="md"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                try {
                                  await deleteCustomEvent.mutateAsync(event.id);
                                  toast.success("Event deleted successfully");
                                } catch (error: any) {
                                  toast.error(error.message || "Failed to delete event");
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    }
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

