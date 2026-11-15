export type Command = { action: "save_note" | "list_notes" | "start_timer" | "start_focus" | "get_time" | "get_status"; text?: string; seconds?: number };
const numbers: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, sixty: 60 };
export function parseCommand(input: string): Command | null {
  const text = input.trim().replace(/^(?:hey\s+)?ultron[,.:!]?\s*/i, "");
  const note = text.match(/^(?:save (?:a )?note|take (?:a )?note|note|remember)(?:\s+that)?\s*[:,-]?\s+(.+)$/i);
  if (note) return { action: "save_note", text: note[1] };
  if (/\b(show|list|read)\b.*\bnotes\b/i.test(text)) return { action: "list_notes" };
  if (/\b(time is it|what.s the time|current time)\b/i.test(text)) return { action: "get_time" };
  if (/\b(status|diagnostics)\b/i.test(text)) return { action: "get_status" };
  if (/\b(timer|focus|countdown)\b/i.test(text)) {
    const duration = text.match(/(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|sixty)[\s-]*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/i);
    const focus = /\bfocus\b/i.test(text);
    if (!duration && !focus) return null;
    const amount = duration ? (numbers[duration[1].toLowerCase()] ?? Number(duration[1])) : 25;
    const unit = duration?.[2].toLowerCase() || "minutes";
    return { action: focus ? "start_focus" : "start_timer", seconds: Math.round(amount * (unit.startsWith("h") ? 3600 : unit.startsWith("m") ? 60 : 1)), text: focus ? "Focus protocol" : "Timer" };
  }
  return null;
}
export function durationLabel(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`; }
