"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Clock, X } from "lucide-react";
import Sidebar from "@/components/SideBar";
import { useRouter } from "next/navigation";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  date: string;
  type: "meeting" | "task" | "deadline" | "inspection";
  attendees: string[];
  color?: string;
  category?: string;
  // preserve original ISO timestamps from backend so day view can compute multi-day spans
  startISO?: string;
  endISO?: string;
  // numeric timestamps (ms) derived from backend dates to avoid reparsing strings
  startMs?: number;
  endMs?: number;
}


// We'll map backend tasks to this shape
const initialEvents: CalendarEvent[] = [];

const eventTypeColors = {
  meeting: "bg-orange-500",
  task: "bg-green-500",
  deadline: "bg-blue-500",
  inspection: "bg-purple-500",
};

const eventTypeBadgeColors = {
  meeting: "bg-orange-100 text-orange-800",
  task: "bg-green-100 text-green-800",
  deadline: "bg-blue-100 text-blue-800",
  inspection: "bg-purple-100 text-purple-800",
};

const attendeeColors = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
];

const getCategoryColor = (category?: string) => {
  if (!category) return "#999999";
  const c = category.toLowerCase();
  switch (c) {
    case "electricidad":
    case "electric":
      return "#007AFF"; // blue
    case "plomeria":
    case "plumbing":
      return "#FF9500"; // orange
    case "construccion":
    case "construction":
      return "#8A2BE2"; // purple
    case "pintura":
    case "paint":
      return "#FF2D92"; // pink
    default:
      return "#10B981"; // green-ish default
  }
};

// Helpers to convert hex colors and generate rgba/darker variants (restored for translucent fills)
const hexToRgb = (hex: string) => {
  const cleaned = hex.replace('#', '').trim();
  const short = cleaned.length === 3;
  const r = parseInt(short ? cleaned[0] + cleaned[0] : cleaned.substring(0,2), 16);
  const g = parseInt(short ? cleaned[1] + cleaned[1] : cleaned.substring(short?2:2, short?4:4), 16);
  const b = parseInt(short ? cleaned[2] + cleaned[2] : cleaned.substring(short?4:4, short?6:6), 16);
  return { r, g, b };
};

const rgbaFromHex = (hex: string, alpha = 1) => {
  try {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (e) {
    return `rgba(16,185,129, ${alpha})`; // fallback
  }
};

const darkenHex = (hex: string, amount = 0.18) => {
  try {
    const { r, g, b } = hexToRgb(hex);
    const rr = Math.max(0, Math.min(255, Math.round(r * (1 - amount))));
    const gg = Math.max(0, Math.min(255, Math.round(g * (1 - amount))));
    const bb = Math.max(0, Math.min(255, Math.round(b * (1 - amount))));
    return `rgba(${rr}, ${gg}, ${bb}, 1)`;
  } catch (e) {
    return `rgba(0,0,0,0.14)`;
  }
};

export default function CalendarPage() {
  const router = useRouter();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedTaskLoading, setSelectedTaskLoading] = useState(false);

  const openTaskDetail = async (id: string) => {
    setSelectedTaskId(id);
    setIsDetailOpen(true);
    setSelectedTaskLoading(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`);
      if (!res.ok) {
        setSelectedTask(null);
      } else {
        const data = await res.json();
        setSelectedTask(data);
      }
    } catch (err) {
      setSelectedTask(null);
    } finally {
      setSelectedTaskLoading(false);
    }
  };

  const closeTaskDetail = () => {
    setIsDetailOpen(false);
    setSelectedTaskId(null);
    setSelectedTask(null);
  };
  // Start on the current date/month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    date: "",
    type: "meeting" as CalendarEvent["type"],
    attendees: [""],
  });

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const dayNames = ["L", "M", "M", "J", "V", "S", "D"];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  };

  const formatDate = (date: Date) => {
    // Use local date parts to avoid timezone shifts from toISOString
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Import hook lazily to avoid adding a top-level dependency in case of server render
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [categoriesMap, setCategoriesMap] = useState<Record<string,string>>({});
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [innerWidth, setInnerWidth] = useState<number>(0);

  useEffect(() => {
    const measure = () => {
      const el = innerRef.current;
      setInnerWidth(el ? Math.max(0, el.getBoundingClientRect().width) : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Read selected site from localStorage (set by Sidebar)
      const selectedSiteId = typeof window !== "undefined" ? localStorage.getItem("selectedSiteId") || "" : "";
      if (!selectedSiteId) {
        // No site selected: clear events and categories and mark loaded so UI can show a message
        setEvents([]);
        setCategoriesMap({});
        setTasksLoaded(true);
        return;
      }
      try {
        const { useTasks } = await import("@/hooks/useTasks");
        // useTasks is a hook; we can't call it outside a component, so instead call the API directly
  const res = await fetch(`/api/tasks?site_id=${encodeURIComponent(selectedSiteId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        // Map Task -> CalendarEvent
        const mapped: CalendarEvent[] = data
          .filter((t: any) => t.start_date) // only map tasks that have a start date
          .map((t: any) => {
            const start = t.start_date ? new Date(t.start_date) : null;
            const end = t.end_date ? new Date(t.end_date) : null;
            // Build local date string (yyyy-mm-dd)
            const date = start ? `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}` : end ? `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}` : "";
            // Build local time strings HH:MM
            const startTime = start ? `${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}` : "08:00";
            const endTime = end ? `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}` : "09:00";
            return {
              id: t.id?.toString() ?? String(Math.random()),
              title: t.title ?? "Tarea",
              description: t.description ?? "",
              startTime,
              endTime,
              date,
              startISO: t.start_date,
              endISO: t.end_date,
              startMs: start ? start.getTime() : undefined,
              endMs: end ? end.getTime() : undefined,
              type: t.category === "inspection" ? "inspection" : t.category === "deadline" ? "deadline" : "task",
              attendees: [],
              color: getCategoryColor(t.category),
              category: t.category,
            } as CalendarEvent;
          });

        setEvents((prev) => {
          // merge but prefer mapped events
          const byId = new Map(prev.map((e) => [e.id, e]));
          for (const m of mapped) byId.set(m.id, m);
          return Array.from(byId.values());
        });

        // Build categories legend map from tasks
        const catMap: Record<string,string> = {};
        for (const t of data) {
          if (t.category) catMap[t.category] = getCategoryColor(t.category);
        }
        setCategoriesMap(catMap);
        setTasksLoaded(true);
      } catch (e) {
        // ignore - do not log to console in production-like environments
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const getEventsForDate = (date: string) => {
    // Return events that overlap the selected date (00:00 - 24:00 local time)
    const dayStart = new Date(`${date}T00:00:00`).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    return events.filter((event) => {
      // Try numeric timestamps first
      let s: number | undefined = (event as any).startMs;
      let e: number | undefined = (event as any).endMs;

      try {
        if (s == null && event.startISO) s = new Date(event.startISO).getTime();
        if (e == null && event.endISO) e = new Date(event.endISO).getTime();

        // fallback: if timestamps still missing, try event.date + startTime/endTime
        if (s == null && event.date && event.startTime) s = new Date(`${event.date}T${event.startTime}:00`).getTime();
        if (e == null && event.date && event.endTime) e = new Date(`${event.date}T${event.endTime}:00`).getTime();
      } catch (err) {
        // ignore parse issues and leave s/e undefined
      }

      // If end is missing, assume 1 hour duration
      if (s != null && e == null) e = s + 60 * 60 * 1000;

      // If start missing, try using event.date at midnight
      if (s == null && event.date) s = new Date(`${event.date}T00:00:00`).getTime();
      if (e == null && event.date) e = new Date(`${event.date}T23:59:59`).getTime();

      if (s == null || e == null) return false;

      // Overlap if event starts before dayEnd and ends after dayStart
      return s < dayEnd && e > dayStart;
    });
  };

  const handleAddEvent = () => {
    if (
      newEvent.title &&
      newEvent.startTime &&
      newEvent.endTime &&
      newEvent.date
    ) {
      const event: CalendarEvent = {
        id: Date.now().toString(),
        title: newEvent.title,
        description: newEvent.description,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        date: newEvent.date,
        type: newEvent.type,
        attendees: newEvent.attendees.filter((a) => a.trim() !== ""),
      };
      setEvents([...events, event]);
      setNewEvent({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        date: "",
        type: "meeting",
        attendees: [""],
      });
      setIsDialogOpen(false);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    const selectedDateString = formatDate(currentDate);

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      );
      const dateString = formatDate(date);
      const dayEvents = getEventsForDate(dateString);
      const isToday = dateString === formatDate(new Date());
      const isSelected = dateString === selectedDateString;

      days.push(
        <div
          key={day}
          role="button"
          onClick={() => setCurrentDate(date)}
          className={`h-24 border border-gray-200 p-1 cursor-pointer ${isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : 'bg-white'}`}
        >
          <div
            className={`text-sm font-medium mb-1 ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}
          >
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event, index) => {
              const bg = event.color || getCategoryColor(event.type);
              const barColor = getCategoryColor(event.category) || darkenHex(bg);
              return (
                <div
                  key={event.id}
                  className={`truncate relative`} 
                  title={`${event.title} (${event.startTime} - ${event.endTime})`}
                  style={{ background: rgbaFromHex(bg, 0.08), color: '#0f172a', padding: '1px 8px 3px 14px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}
                >
                  <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 4, backgroundColor: barColor, borderRadius: 4 }} />
                  <div style={{ marginLeft: 6, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{event.title}</div>
                </div>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 2} más
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const renderTimeSlots = () => {
    const selectedDate = formatDate(currentDate);
    const dayEvents = getEventsForDate(selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Visual layout constants
  const startHour = 8;
  const endHour = 21;
  const hourHeight = 64; // px per hour
  const minutesToPx = (minutes: number) => (minutes / 60) * hourHeight;
  // container covers hours from startHour to endHour (exclusive) so no +1
  const containerHeight = (endHour - startHour) * hourHeight;

    return (
      <div style={{ height: containerHeight }} className="relative">
        {/* Hour labels and separators */}
        <div className="absolute left-0 top-0 bottom-0 w-full">
          {Array.from({ length: endHour - startHour }).map((_, i) => {
            const hour = startHour + i;
            const top = i * hourHeight;
            return (
              <div key={hour} className="absolute left-0 right-0" style={{ top }}>
                <div className="border-b border-gray-100" style={{ height: hourHeight }}>
                  <div className="h-full flex items-center">
                    <div className="w-16 flex items-center justify-end pr-4 text-sm text-gray-500">{`${hour.toString().padStart(2, "0")}:00`}</div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Events positioned with overlap columns */}
        <div ref={innerRef} className="absolute left-0 top-0 right-0" style={{ height: containerHeight }}>
          {(() => {
            // Prepare events with minute ranges. Use original date/time when possible.
            type E = (CalendarEvent & { startMin: number; endMin: number; startDateObj?: Date; endDateObj?: Date; col?: number; cols?: number });
            const evs: E[] = dayEvents.map((event) => {
              // compute minutes relative to the selectedDate's startHour (preferred reference)
              const refStartMs = new Date(`${selectedDate}T${String(startHour).padStart(2,'0')}:00:00`).getTime();
              const visibleStartMin = 0;
              const visibleEndMin = (endHour - startHour) * 60;

              let startMin = visibleStartMin;
              let endMin = visibleEndMin;

              try {
                // Prefer local parse from event.date + time (guarantees local timezone interpretation)
                let sMs: number | undefined = undefined;
                let eMs: number | undefined = undefined;
                if (event.date && event.startTime) {
                  sMs = new Date(`${event.date}T${event.startTime}:00`).getTime();
                }
                if (event.date && event.endTime) {
                  eMs = new Date(`${event.date}T${event.endTime}:00`).getTime();
                }

                // Fallback to numeric timestamps provided by backend
                if (sMs == null && typeof (event as any).startMs === 'number') sMs = (event as any).startMs;
                if (eMs == null && typeof (event as any).endMs === 'number') eMs = (event as any).endMs;

                // Last-resort fallback to ISO strings
                if (sMs == null && event.startISO) sMs = new Date(event.startISO).getTime();
                if (eMs == null && event.endISO) eMs = new Date(event.endISO).getTime();

                if (typeof sMs === 'number') {
                  startMin = Math.floor((sMs - refStartMs) / 60000);
                }
                if (typeof eMs === 'number') {
                  endMin = Math.floor((eMs - refStartMs) / 60000);
                }

                // Final fallback to parsing time strings (local)
                if (typeof sMs !== 'number' && event.startTime) {
                  const [sh, sm] = event.startTime.split(":").map((v) => parseInt(v, 10));
                  startMin = (sh - startHour) * 60 + sm;
                }
                if (typeof eMs !== 'number' && event.endTime) {
                  const [eh, em] = event.endTime.split(":").map((v) => parseInt(v, 10));
                  endMin = (eh - startHour) * 60 + em;
                }

                // Debug logs for developer (console)
                // Developer debug logs removed to keep console clean
              } catch (err) {
                // fallback to parsing times
                const [sh, sm] = event.startTime.split(":").map((v) => parseInt(v, 10));
                const [eh, em] = event.endTime.split(":").map((v) => parseInt(v, 10));
                startMin = (sh - startHour) * 60 + sm;
                endMin = (eh - startHour) * 60 + em;
              }

              return { ...event, startMin, endMin } as E;
            });

            // Group overlapping events using a simple sweep algorithm (original behavior)
            evs.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
            const groups: E[][] = [];

            for (const e of evs) {
              let placed = false;
              for (const g of groups) {
                // If overlaps with any in group, add to that group
                if (g.some((x) => !(e.endMin <= x.startMin || e.startMin >= x.endMin))) {
                  g.push(e);
                  placed = true;
                  break;
                }
              }
              if (!placed) groups.push([e]);
            }

            // For each group, assign columns
            const positioned: E[] = [];
            groups.forEach((g) => {
              // assign columns greedily
              const cols: E[][] = [];
              for (const ev of g) {
                let placed = false;
                for (let i = 0; i < cols.length; i++) {
                  const col = cols[i];
                  if (!col.some((x) => !(ev.endMin <= x.startMin || ev.startMin >= x.endMin))) {
                    col.push(ev);
                    ev.col = i;
                    placed = true;
                    break;
                  }
                }
                if (!placed) {
                  ev.col = cols.length;
                  cols.push([ev]);
                }
              }
              const total = cols.length || 1;
              for (const col of cols) for (const ev of col) { ev.cols = total; positioned.push(ev); }
            });

            // Px layout: use hourHeight as source of truth for vertical scale
            const leftOffsetPx = 75; // left gutter + labels like mobile
            const rightPaddingPx = 20; // small right padding similar to mobile
            const spacing = 4; // px between overlapping events
            const pixelsPerMinute = hourHeight / 60; // derive from hourHeight so events align with hour lines

            // available width for event columns
            const availableWidth = Math.max(0, innerWidth - leftOffsetPx - rightPaddingPx);

            return (
              <div key="events-inner" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: containerHeight }}>
                {positioned.map((event) => {
                  // clamp start/end minutes to visible range
                  const visibleStart = 0;
                  const visibleEnd = (endHour - startHour) * 60;
                  const startMinClamped = Math.max(visibleStart, Math.min(visibleEnd, event.startMin));
                  const endMinClamped = Math.max(visibleStart, Math.min(visibleEnd, event.endMin));
                  const durationMin = Math.max(15, endMinClamped - startMinClamped);

                  // compute px positions using minutesToPx (derived from hourHeight)
                  const topPx = Math.round(minutesToPx(startMinClamped));
                  const heightPx = Math.max(20, Math.round(minutesToPx(durationMin)));

                  const bg = event.color || getCategoryColor(event.type);
                  const col = event.col ?? 0;
                  const cols = event.cols ?? 1;

                  const totalSpacing = Math.max(0, (cols - 1) * spacing);
                  const eventWidthPx = cols > 0 ? Math.max(40, Math.floor((availableWidth - totalSpacing) / cols)) : Math.floor(availableWidth);
                  const leftPx = leftOffsetPx + col * (eventWidthPx + spacing);
                  const contentWidth = Math.max(40, eventWidthPx - 6);
                  // width-based visibility thresholds (px)
                  const SHOW_TITLE_MIN = 56; // show title when at least this wide
                  const SHOW_META_MIN = 120; // show time and category only when this wide
                  const showTitle = contentWidth >= SHOW_TITLE_MIN;
                  const showMeta = contentWidth >= SHOW_META_MIN;

                  return (
                    <div
                      key={event.id}
                      role="button"
                      onClick={() => openTaskDetail(event.id)}
                      className="absolute rounded-lg text-white overflow-hidden cursor-pointer"
                      style={{
                        top: topPx,
                        height: heightPx,
                        left: leftPx,
                        width: contentWidth,
                        background: rgbaFromHex(bg, 0.08),
                        borderRadius: 10,
                        boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                        border: 'none',
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        position: 'absolute',
                        overflow: 'hidden',
                        zIndex: 10 + col
                      }}
                      title={`${event.title} ${event.startTime} - ${event.endTime}`}
                    >
                      <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 4, backgroundColor: getCategoryColor(event.category) || darkenHex(bg), borderRadius: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }} />
                      <div className="truncate" style={{ marginLeft: 9 }}>
                        {showTitle ? (
                          <div className="font-semibold text-sm leading-4 text-slate-900 truncate">{event.title}</div>
                        ) : null}
                        {showMeta ? (
                          <>
                            <div className="text-xs text-slate-600">{event.startTime} - {event.endTime}</div>
                            {event.category && <div className="text-[11px] text-slate-500 mt-1">{event.category}</div>}
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">

      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Calendario</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth("prev")}
              >
                <ChevronLeft size={20} />
              </Button>
              <h2 className="text-xl font-semibold text-gray-700 min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth("next")}
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus size={20} className="mr-2" />
                Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Evento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Título del evento"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                />
                <Textarea
                  placeholder="Descripción"
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                />
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, date: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="time"
                    placeholder="Hora inicio"
                    value={newEvent.startTime}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, startTime: e.target.value })
                    }
                  />
                  <Input
                    type="time"
                    placeholder="Hora fin"
                    value={newEvent.endTime}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, endTime: e.target.value })
                    }
                  />
                </div>
                <Select
                  value={newEvent.type}
                  onValueChange={(value: CalendarEvent["type"]) =>
                    setNewEvent({ ...newEvent, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Reunión</SelectItem>
                    <SelectItem value="task">Tarea</SelectItem>
                    <SelectItem value="deadline">Fecha límite</SelectItem>
                    <SelectItem value="inspection">Inspección</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Asistentes (separados por coma)"
                  value={newEvent.attendees.join(", ")}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      attendees: e.target.value.split(",").map((a) => a.trim()),
                    })
                  }
                />
                <Button onClick={handleAddEvent} className="w-full">
                  Crear Evento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {dayNames.map((day, index) => (
                    <div
                      key={index}
                      className="p-3 text-center text-sm font-medium text-gray-500 border-r border-gray-200 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7">{renderCalendarGrid()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Day View */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock size={20} />
                  {currentDate.toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <div className="max-h-96 overflow-y-auto">
                  {renderTimeSlots()}
                </div>
              </CardContent>
            </Card>

            <Dialog open={isDetailOpen} onOpenChange={(v) => !v && closeTaskDetail()}>
              <DialogContent
                className="max-w-lg w-full"
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: 0,
                }}
              >
                <div className="relative px-4 py-4">
                  {/* left color bar */}
                  {selectedTask && (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 10,
                        top: 10,
                        bottom: 10,
                        width: 6,
                        backgroundColor: getCategoryColor(selectedTask.category),
                        borderRadius: 6,
                        boxShadow: '0 6px 18px rgba(0,0,0,0.06)'
                      }}
                    />
                  )}

                  <DialogHeader className="pl-3 pr-12">
                    <DialogTitle className="text-lg font-semibold" style={{ color: selectedTask ? darkenHex(getCategoryColor(selectedTask.category)) : undefined }}>Detalle de Tarea</DialogTitle>
                  </DialogHeader>

                  <DialogClose className="absolute right-3 top-3 p-1 rounded hover:bg-slate-100">
                    <X size={16} />
                  </DialogClose>

                  <div className="pt-2 pl-3">
                    {selectedTaskLoading ? (
                      <div>Cargando...</div>
                    ) : selectedTask ? (
                      <div>
                        <h4 className="font-semibold text-lg text-slate-900 truncate">{selectedTask.title}</h4>
                        <div className="mt-0 flex items-center gap-3">
                          <div className="text-sm text-slate-600">
                            {selectedTask.start_date ? new Date(selectedTask.start_date).toLocaleString() : ''}
                            {selectedTask.end_date ? ` - ${new Date(selectedTask.end_date).toLocaleString()}` : ''}
                          </div>
                          {selectedTask.category && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium"
                              style={{
                                background: rgbaFromHex(getCategoryColor(selectedTask.category), 0.12),
                                color: darkenHex(getCategoryColor(selectedTask.category)),
                              }}
                            >
                              {selectedTask.category}
                            </span>
                          )}
                        </div>

                        {selectedTask.description && (
                          <div className="mt-4 text-sm text-slate-700 leading-relaxed">
                            {selectedTask.description}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>No se encontró la tarea.</div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Legend removed per design: categories are reflected as event colors */}
          </div>
        </div>
      </div>
    </div>
  );
}
