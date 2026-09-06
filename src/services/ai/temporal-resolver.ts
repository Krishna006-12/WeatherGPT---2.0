/**
 * Deterministic Temporal Resolver.
 *
 * Extracts temporal expressions from user queries and resolves them into exact
 * calendar dates and hourly windows strictly in the target location's IANA timezone.
 *
 * Never relies on the LLM to calculate dates or timestamps.
 */

export type TemporalTarget =
  | "current"
  | "today"
  | "tonight"
  | "tomorrow"
  | "tomorrow_morning"
  | "tomorrow_afternoon"
  | "tomorrow_evening"
  | "next_24_hours"
  | "next_48_hours"
  | "this_week"
  | "next_week";

export interface TemporalResolution {
  target: TemporalTarget;
  label: string;
  targetDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  hourStart?: number; // 0-23
  hourEnd?: number;   // 0-23
  timezone: string;
  isFuture: boolean;
  cleanQuery: string;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function getDatePartsInTimezone(date: Date, timezone: string): DateParts {
  const tz = timezone && timezone !== "auto" ? timezone : "UTC";
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    return {
      year: parseInt(map.year || "2026", 10),
      month: parseInt(map.month || "1", 10),
      day: parseInt(map.day || "1", 10),
      hour: parseInt(map.hour === "24" ? "0" : map.hour || "0", 10),
      minute: parseInt(map.minute || "0", 10),
    };
  } catch {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    };
  }
}

function formatYYYYMMDD(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function addDaysToParts(parts: DateParts, daysToAdd: number): string {
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysToAdd));
  return formatYYYYMMDD(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate()
  );
}

export class TemporalResolver {
  /**
   * Resolve temporal targets from a query in the context of the target location's timezone.
   */
  resolve(
    query: string,
    timezone: string = "UTC",
    referenceDate: Date = new Date()
  ): TemporalResolution {
    const text = query.trim().toLowerCase();
    const parts = getDatePartsInTimezone(referenceDate, timezone);
    const todayDate = formatYYYYMMDD(parts.year, parts.month, parts.day);

    // 1. Tomorrow Sub-windows
    if (/\b(?:tomorrow\s+morning|kal\s+subah)\b/i.test(text)) {
      return {
        target: "tomorrow_morning",
        label: "Tomorrow Morning",
        targetDate: addDaysToParts(parts, 1),
        hourStart: 6,
        hourEnd: 12,
        timezone,
        isFuture: true,
        cleanQuery: query.replace(/\b(?:tomorrow\s+morning|kal\s+subah)\b/gi, "").trim(),
      };
    }

    if (/\b(?:tomorrow\s+afternoon|kal\s+dopahar)\b/i.test(text)) {
      return {
        target: "tomorrow_afternoon",
        label: "Tomorrow Afternoon",
        targetDate: addDaysToParts(parts, 1),
        hourStart: 12,
        hourEnd: 18,
        timezone,
        isFuture: true,
        cleanQuery: query.replace(/\b(?:tomorrow\s+afternoon|kal\s+dopahar)\b/gi, "").trim(),
      };
    }

    if (/\b(?:tomorrow\s+evening|tomorrow\s+night|kal\s+shaam|kal\s+raat)\b/i.test(text)) {
      return {
        target: "tomorrow_evening",
        label: "Tomorrow Evening",
        targetDate: addDaysToParts(parts, 1),
        hourStart: 18,
        hourEnd: 23,
        timezone,
        isFuture: true,
        cleanQuery: query.replace(/\b(?:tomorrow\s+evening|tomorrow\s+night|kal\s+shaam|kal\s+raat)\b/gi, "").trim(),
      };
    }

    // 2. Tomorrow
    if (/\b(?:tomorrow|kal)\b/i.test(text) && !/\b(?:yesterday|aaj)\b/i.test(text)) {
      return {
        target: "tomorrow",
        label: "Tomorrow",
        targetDate: addDaysToParts(parts, 1),
        timezone,
        isFuture: true,
        cleanQuery: query.replace(/\b(?:tomorrow|kal)\b/gi, "").trim(),
      };
    }

    // 3. Tonight
    if (/\b(?:tonight|aaj\s+raat|this\s+evening)\b/i.test(text)) {
      return {
        target: "tonight",
        label: "Tonight",
        targetDate: todayDate,
        hourStart: 18,
        hourEnd: 23,
        timezone,
        isFuture: parts.hour < 23,
        cleanQuery: query.replace(/\b(?:tonight|aaj\s+raat|this\s+evening)\b/gi, "").trim(),
      };
    }

    // 4. Next 48 Hours
    if (/\b(?:next\s+48\s*hours|48\s*hours|next\s+2\s*days|2\s*days)\b/i.test(text)) {
      return {
        target: "next_48_hours",
        label: "Next 48 Hours",
        targetDate: todayDate,
        endDate: addDaysToParts(parts, 2),
        timezone,
        isFuture: true,
        cleanQuery: query.replace(/\b(?:next\s+48\s*hours|48\s*hours|next\s+2\s*days|2\s*days)\b/gi, "").trim(),
      };
    }

    // 5. Next 24 Hours
    if (/\b(?:next\s+24\s*hours|24\s*hours|coming\s+day)\b/i.test(text)) {
      return {
        target: "next_24_hours",
        label: "Next 24 Hours",
        targetDate: todayDate,
        endDate: addDaysToParts(parts, 1),
        timezone,
        isFuture: true,
        cleanQuery: query.replace(/\b(?:next\s+24\s*hours|24\s*hours|coming\s+day)\b/gi, "").trim(),
      };
    }

    // 6. Next Week
    if (/\b(?:next\s+week|coming\s+week|agle\s+hafte)\b/i.test(text)) {
      return {
        target: "next_week",
        label: "Next Week",
        targetDate: addDaysToParts(parts, 7),
        endDate: addDaysToParts(parts, 14),
        timezone,
        isFuture: true,
        cleanQuery: query.replace(/\b(?:next\s+week|coming\s+week|agle\s+hafte)\b/gi, "").trim(),
      };
    }

    // 7. This Week
    if (/\b(?:this\s+week|week\s+ahead|7\s*days|7\s*day|seven\s*days)\b/i.test(text)) {
      return {
        target: "this_week",
        label: "This Week",
        targetDate: todayDate,
        endDate: addDaysToParts(parts, 6),
        timezone,
        isFuture: true,
        cleanQuery: query.replace(/\b(?:this\s+week|week\s+ahead|7\s*days|7\s*day|seven\s*days)\b/gi, "").trim(),
      };
    }

    // 8. Today
    if (/\b(?:today|aaj|this\s+morning|this\s+afternoon)\b/i.test(text)) {
      return {
        target: "today",
        label: "Today",
        targetDate: todayDate,
        timezone,
        isFuture: false,
        cleanQuery: query.replace(/\b(?:today|aaj|this\s+morning|this\s+afternoon)\b/gi, "").trim(),
      };
    }

    // Default: current (now / right now)
    return {
      target: "current",
      label: "Current",
      targetDate: todayDate,
      timezone,
      isFuture: false,
      cleanQuery: query.replace(/\b(?:right\s+now|now|currently|outside)\b/gi, "").trim(),
    };
  }
}

export const globalTemporalResolver = new TemporalResolver();
