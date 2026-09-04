export function getHourKey(dateStr: string | number | Date, timezone: string): string {
  const date = new Date(dateStr);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  
  const parts = formatter.formatToParts(date);
  const v: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      v[part.type] = part.value;
    }
  }

  return `${v.year}-${v.month}-${v.day}-${v.hour}`;
}

export function isCurrentHour(timestamp: string | number | Date, timezone: string, now: Date = new Date()): boolean {
  return getHourKey(timestamp, timezone) === getHourKey(now, timezone);
}

export function formatTime(timestamp: string | number | Date, timezone: string): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: true,
  }).format(date);
}

export function formatDayName(timestamp: string | number | Date, timezone: string, style: "short" | "long" | "narrow" = "short"): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: style,
  }).format(date);
}

