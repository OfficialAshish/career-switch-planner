import { randomUUID } from 'node:crypto';
import type { State, Proposal, Track } from '../shared/schema.js';
import { day, proposalSchema } from '../shared/schema.js';
export function quickLog(input: string, date: string, state: State): Proposal {
  day.parse(date);
  if (!input.trim() || input.length > 5000)
    throw new Error('Write a short log (up to 5,000 characters).');
  const matches = [...input.matchAll(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/gi)];
  const minutes = Math.round(
    matches.reduce((n, m) => n + Number(m[1]) * (/^h/i.test(m[2]) ? 60 : 1), 0),
  );
  const track: Track = /\bsql\b/i.test(input)
    ? 'SQL'
    : /\b(lc|leetcode|dsa|array|graph|linked list|dp|tree|sliding window)\b/i.test(input)
      ? 'DSA'
      : /\b(interview|mock|speaking)\b/i.test(input)
        ? 'Interview'
        : /\b(rag|llm|agent|embedding)\b/i.test(input)
          ? 'AI'
          : /\b(system design|architecture)\b/i.test(input)
            ? 'Systems'
            : /\b(apply|application|referral|resume)\b/i.test(input)
              ? 'Career'
              : 'Backend';
  const ops: Proposal['operations'] = [];
  const lc = input.match(/\b(?:LC|leetcode)\s*#?\s*(\d+)/i);
  const question =
    lc &&
    state.questions.find(
      (q) => q.number === Number(lc[1]) && q.kind === (track === 'SQL' ? 'SQL' : 'DSA'),
    );
  const result = /\b(failed|could not solve|couldn't solve)\b/i.test(input)
    ? 'Failed'
    : /\b(hinted|used a hint|with hints?|editorial)\b/i.test(input)
      ? 'Hinted'
      : /\b(independent|without hints?|no hints?|on my own)\b/i.test(input)
        ? 'Independent'
        : null;
  if (minutes >= 1 && minutes <= 720)
    ops.push({
      kind: 'session',
      value: { id: randomUUID(), date, minutes, track, summary: input.slice(0, 300), taskId: '' },
    });
  if (question && result && minutes >= 1 && minutes <= 240)
    ops.push({
      kind: 'attempt',
      value: {
        id: randomUUID(),
        questionId: question.id,
        date,
        result,
        minutes,
        notes: input,
        language: track === 'SQL' ? 'SQL' : 'Python',
      },
    });
  if (!ops.length)
    ops.push({
      kind: 'note',
      value: {
        id: randomUUID(),
        title: input.slice(0, 90),
        category: track,
        body: input,
        tags: ['quick-capture'],
        attachments: [],
        updatedAt: new Date().toISOString(),
      },
    });
  const warnings = [
    !minutes && 'No duration found: no study time was invented.',
    minutes > 720 && 'Duration exceeded 12 hours: saved as a note, not a time entry.',
    lc && !question && 'That question ID is not in this catalog; no practice attempt was invented.',
    question &&
      !result &&
      'No explicit independent/hinted/failed result: no practice outcome was invented.',
  ]
    .filter(Boolean)
    .join(' ');
  return proposalSchema.parse({
    summary: `Offline parser: ${ops.length} proposed record(s). Review before saving. ${warnings}`,
    operations: ops,
  });
}
