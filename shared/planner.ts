import type { State, Task, Question } from './schema.js';
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(day: string, count: number) {
  const date = new Date(day + 'T12:00:00'); date.setDate(date.getDate() + count); return localDay(date);
}
export function weekStart(day: string) {
  const date = new Date(day + 'T12:00:00'); return addDays(day, -((date.getDay() + 6) % 7));
}
export function nextReview(state: State, question: Question): string | null {
  const attempts = state.attempts.filter(a => a.questionId === question.id).sort((a, b) => a.date.localeCompare(b.date) || state.attempts.indexOf(a) - state.attempts.indexOf(b));
  if (!attempts.length) return null;
  const latest = attempts.at(-1)!;
  let streak = 0;
  for (let i = attempts.length - 1; i >= 0 && attempts[i].result === 'Independent'; i--) streak++;
  return addDays(latest.date, latest.result !== 'Independent' ? 1 : [3, 7, 21][Math.min(2, streak - 1)]);
}
export function taskRemaining(state: State, task: Task) {
  if (task.status === 'done') return 0;
  const spent = state.sessions.filter(s => s.taskId === task.id).reduce((n, s) => n + s.minutes, 0);
  // Work logged is not proof that an unfinished task needs no further time.
  return Math.max(15, task.estimateMinutes - spent);
}
export function planning(state: State, today = localDay()) {
  const weeklyMinutes = state.profile.weeklyHours * 60;
  const monday = weekStart(today);
  const actualMinutes = state.sessions.filter(s => weekStart(s.date) === monday).reduce((n, s) => n + s.minutes, 0);
  const done = new Set(state.tasks.filter(t => t.status === 'done').map(t => t.id));
  const unfinished = state.tasks.filter(t => !done.has(t.id));
  const available = unfinished.filter(t => t.status !== 'blocked' && t.prerequisites.every(p => done.has(p)));
  const due = state.questions.filter(q => { const date = nextReview(state, q); return date !== null && date <= today; });
  const ratios = state.tasks.filter(t => t.status === 'done').flatMap(t => {
    const mins = state.sessions.filter(s => s.taskId === t.id).reduce((n, s) => n + s.minutes, 0);
    return mins > 0 ? [mins / t.estimateMinutes] : [];
  }).sort((a, b) => a - b);
  const observed = ratios.length >= 5;
  const pace = observed ? Math.max(.5, Math.min(2, ratios[Math.floor(ratios.length / 2)])) : 1;
  const remainingMinutes = unfinished.reduce((n, t) => n + taskRemaining(state, t) * pace, 0);
  const weekCount = Math.ceil(remainingMinutes / weeklyMinutes);
  const forecast = unfinished.length ? addDays(today, Math.ceil(remainingMinutes / weeklyMinutes * 7)) : today;
  const eligible: Task[] = [], pool = [...unfinished], planned = new Set(done);
  while (pool.length) {
    const idx = pool.findIndex(t => t.status !== 'blocked' && t.prerequisites.every(p => planned.has(p)));
    if (idx < 0) break;
    const [task] = pool.splice(idx, 1); eligible.push(task); planned.add(task.id);
  }
  const weeks: { start: string; minutes: number; tasks: { id: string; title: string; track: string; minutes: number }[] }[] = [];
  let slot = 0;
  for (const task of eligible) {
    let left = Math.ceil(taskRemaining(state, task) * pace);
    while (left > 0 && slot < 104) {
      if (!weeks[slot]) weeks[slot] = { start: addDays(monday, slot * 7), minutes: 0, tasks: [] };
      const cap = Math.max(0, weeklyMinutes - (slot === 0 ? actualMinutes : 0));
      const free = cap - weeks[slot].minutes;
      if (free <= 0) { slot++; continue; }
      const take = Math.min(left, free);
      weeks[slot].tasks.push({ id: task.id, title: task.title, track: task.track, minutes: take });
      weeks[slot].minutes += take; left -= take;
    }
  }
  return {
    weeklyMinutes, actualMinutes, remainingThisWeek: Math.max(0, weeklyMinutes - actualMinutes),
    done: done.size, total: state.tasks.length, remainingMinutes, weekCount, forecast,
    forecastRange: [addDays(today, Math.ceil(remainingMinutes / weeklyMinutes * 7 * .8)), addDays(today, Math.ceil(remainingMinutes / weeklyMinutes * 7 * 1.35))],
    pace, observed, paceSamples: ratios.length, available, due, weeks,
    blocked: pool.length, verifiedGates: state.gates.filter(g => g.status === 'Verified' && g.evidence.trim()).length,
  };
}