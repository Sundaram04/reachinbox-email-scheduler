const DAY_MS = 24 * 60 * 60 * 1000;

const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const clock = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});
const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const full = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatScheduledTime(iso: string, now = Date.now()) {
  const date = new Date(iso);
  const diff = date.getTime() - now;

  if (diff > -DAY_MS && diff < 6 * DAY_MS) {
    return `${weekday.format(date)} ${clock.format(date)}`;
  }

  return `${monthDay.format(date)}, ${clock.format(date)}`;
}

export function formatDateTime(iso: string) {
  return full.format(new Date(iso));
}

export function formatShortDate(iso: string) {
  const date = new Date(iso);

  return `${monthDay.format(date)}, ${clock.format(date)}`;
}
