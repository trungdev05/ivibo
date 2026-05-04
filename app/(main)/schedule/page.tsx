'use client';
import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface ScheduleEvent {
  id: string;
  title: string;
  type: 'work' | 'leave' | 'overtime' | 'meeting';
  date: string; // ISO date string (YYYY-MM-DD)
  start: string; // HH:MM
  end: string;
  user: string;
}

const TYPE_COLOR: Record<ScheduleEvent['type'], string> = {
  work: 'bg-blue-100 text-blue-700 border-blue-200',
  leave: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  overtime: 'bg-orange-100 text-orange-700 border-orange-200',
  meeting: 'bg-purple-100 text-purple-700 border-purple-200',
};

const TYPE_LABEL: Record<ScheduleEvent['type'], string> = {
  work: 'Làm việc',
  leave: 'Nghỉ phép',
  overtime: 'Tăng ca',
  meeting: 'Họp',
};

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function SchedulePage() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetch('/api/schedule')
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const weekDays = getWeekDays(currentDate);

  const eventsOnDay = (day: Date) => {
    const iso = day.toISOString().slice(0, 10);
    return events.filter((e) => e.date === iso);
  };

  const moveWeek = (delta: number) => {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + delta * 7);
      return next;
    });
  };

  const weekLabel = `${weekDays[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – ${weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">Lịch trình</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => moveWeek(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-40 text-center">{weekLabel}</span>
          <button onClick={() => moveWeek(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="ml-2 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Hôm nay
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Đang tải...</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const dayEvents = eventsOnDay(day);
              return (
                <div key={i} className="min-h-36">
                  <div className={`text-center mb-2 py-1.5 rounded-lg ${isToday ? 'bg-blue-600' : ''}`}>
                    <p className={`text-xs font-medium ${isToday ? 'text-blue-100' : 'text-gray-500'}`}>
                      {DAY_LABELS[i]}
                    </p>
                    <p className={`text-lg font-semibold leading-tight ${isToday ? 'text-white' : 'text-gray-900'}`}>
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className={`p-1.5 rounded border text-xs ${TYPE_COLOR[ev.type]}`}
                      >
                        <p className="font-medium truncate">{ev.title}</p>
                        <p className="opacity-70">{ev.start}–{ev.end}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
