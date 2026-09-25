// Workflow schedules are stored as a cron in UTC — that's what the scheduler
// (execute-scheduled-workflows) runs on. Sellers think in their own time, so
// the form works in local time and converts on save, and every "next run" is
// computed in UTC so it matches when the scheduler will actually fire.

const num = (v) => /^\d+$/.test(v || '');

// Next time a UTC cron ("M H * * D", "M * * * *", "M H * * *") fires.
export function nextRunFromUtcCron(cron, from = new Date()) {
  if (cron === '*/2 * * * *') return new Date(from.getTime() + 2 * 60 * 1000).toISOString();
  const [m, h, , , dow] = String(cron).trim().split(/\s+/);
  const minute = num(m) ? Number(m) : 0;
  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  if (h === '*') {
    next.setUTCMinutes(minute);
    if (next <= from) next.setUTCHours(next.getUTCHours() + 1);
  } else {
    next.setUTCHours(num(h) ? Number(h) : 9, minute, 0, 0);
    if (num(dow)) {
      next.setUTCDate(next.getUTCDate() + ((Number(dow) - next.getUTCDay() + 7) % 7));
      if (next <= from) next.setUTCDate(next.getUTCDate() + 7);
    } else if (next <= from) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
  }
  return next.toISOString();
}

// Shift a simple cron by the browser's current UTC offset. direction +1: local → UTC, -1: UTC → local.
function shiftCron(cron, direction) {
  const [m, h, dom, mon, dow] = String(cron).trim().split(/\s+/);
  if (!num(m) || !num(h)) return cron; // hourly / every-N-minutes: no conversion needed
  const offsetMin = new Date().getTimezoneOffset(); // minutes to ADD to local to get UTC
  let total = Number(h) * 60 + Number(m) + direction * offsetMin;
  const dayShift = Math.floor(total / 1440);
  total = ((total % 1440) + 1440) % 1440;
  const newDow = num(dow) ? String(((Number(dow) + dayShift) % 7 + 7) % 7) : dow;
  return `${total % 60} ${Math.floor(total / 60)} ${dom} ${mon} ${newDow}`;
}
export const localCronToUtc = (cron) => shiftCron(cron, +1);
export const utcCronToLocal = (cron) => shiftCron(cron, -1);

// Workflow schedules are stored as a UTC cron ("M H * * D"). Show them in the
// seller's own time zone, e.g. "Mondays at 9:00 AM CDT".
export function describeCron(cron) {
  const [m, h, dom, mon, dow] = String(cron).trim().split(/\s+/);
  const num = (v) => /^\d+$/.test(v || '');
  try {
    if (num(m) && h === '*' && dom === '*' && mon === '*' && (dow === '*' || !dow)) {
      return `Every hour at :${String(m).padStart(2, '0')}`;
    }
    if (num(m) && num(h) && dom === '*' && mon === '*') {
      const d = new Date();
      d.setUTCHours(Number(h), Number(m), 0, 0);
      if (num(dow)) d.setUTCDate(d.getUTCDate() + ((Number(dow) - d.getUTCDay() + 7) % 7));
      const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
      const day = num(dow) ? d.toLocaleDateString([], { weekday: 'long' }) + 's' : 'Every day';
      return `${day} at ${time}`;
    }
  } catch { /* fall through */ }
  return `On a schedule (${cron}, UTC)`;
}

// Orion's schedules are in the seller's own clock: {"days":["monday"],"time":"09:00"}.
export function describeLocalSchedule(schedule) {
  const days = Array.isArray(schedule.days) ? schedule.days : schedule.days ? [schedule.days] : [];
  const daily = days.length === 0 || days.some((d) => /^(daily|every ?day)$/i.test(String(d)));
  const [h, m] = String(schedule.time || '09:00').split(':').map((n) => parseInt(n, 10));
  const d = new Date(); d.setHours(h || 0, m || 0, 0, 0);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  const label = daily ? 'Every day' : days.map((x) => String(x).charAt(0).toUpperCase() + String(x).slice(1).toLowerCase() + 's').join(', ');
  return `${label} at ${time}`;
}

