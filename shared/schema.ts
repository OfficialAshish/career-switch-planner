import { z } from 'zod';
export const tracks = ['DSA', 'SQL', 'Backend', 'AI', 'Systems', 'Interview', 'Career'] as const;
export const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const text = z.string().max(20_000);
export const short = z.string().max(300);
export const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T12:00:00Z');
    return Number.isFinite(+d) && d.toISOString().slice(0, 10) === v;
  }, 'Use a real calendar date');
export const url = z
  .string()
  .max(2048)
  .refine((v) => {
    if (!v) return true;
    try {
      return ['https:', 'http:'].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  }, 'Use an http(s) URL');
export const track = z.enum(tracks);
export const taskSchema = z
  .object({
    id,
    title: short.min(1),
    track,
    estimateMinutes: z.number().int().min(5).max(2400),
    status: z.enum(['todo', 'doing', 'done', 'blocked']),
    prerequisites: z.array(id).max(20),
    evidence: text,
    priority: z.enum(['core', 'extension']),
    createdAt: short,
  })
  .strict();
export const sessionSchema = z
  .object({
    id,
    date: day,
    minutes: z.number().int().min(1).max(720),
    track,
    summary: short.min(1),
    taskId: z.union([id, z.literal('')]),
  })
  .strict();
export const questionSchema = z
  .object({
    id,
    number: z.number().int().positive(),
    kind: z.enum(['DSA', 'SQL']),
    title: short,
    pattern: short,
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    url,
    fallback: text,
    status: z.enum(['Not started', 'Learning', 'Independent', 'Explain-ready']),
    notes: text,
  })
  .strict();
export const attemptSchema = z
  .object({
    id,
    questionId: id,
    date: day,
    result: z.enum(['Independent', 'Hinted', 'Failed']),
    minutes: z.number().int().min(1).max(240),
    notes: text,
    language: short,
  })
  .strict();
export const noteSchema = z
  .object({
    id,
    title: short.min(1),
    category: short,
    body: text,
    tags: z.array(short).max(20),
    attachments: z.array(id).max(10),
    updatedAt: short,
  })
  .strict();
export const projectSchema = z
  .object({
    id,
    title: short.min(1),
    status: z.enum(['Planned', 'Building', 'Evidence ready']),
    summary: text,
    evidence: text,
    nextAction: short,
  })
  .strict();
export const claimSchema = z
  .object({
    id,
    text: text.min(1),
    category: z.enum(['Experience', 'Project', 'Skill']),
    status: z.enum(['Planned', 'Working', 'Verified']),
    evidence: text,
  })
  .strict();
export const storySchema = z
  .object({
    id,
    title: short.min(1),
    prompt: short,
    body: text,
    followups: z.array(short).max(20),
  })
  .strict();
export const jobSchema = z
  .object({
    id,
    company: short.min(1),
    role: short,
    url,
    location: short,
    stage: z.enum(['Research', 'Applied', 'Screen', 'Technical', 'Final', 'Offer', 'Closed']),
    jd: text,
    notes: text,
    nextAction: short,
  })
  .strict();
export const sourceSchema = z
  .object({
    id,
    title: short.min(1),
    url,
    excerpt: text,
    checkedAt: day,
    notes: text,
  })
  .strict();
export const gateSchema = z
  .object({
    id,
    area: short,
    criteria: text,
    status: z.enum(['Not started', 'Building', 'Verified']),
    evidence: text,
  })
  .strict()
  .refine(
    (g) => g.status !== 'Verified' || g.evidence.trim().length >= 5,
    'Verified gates need evidence',
  );
export const profileSchema = z
  .object({
    name: short,
    headline: short,
    targetRole: short,
    location: short,
    email: short,
    phone: short,
    links: text,
    education: text,
    employment: text,
    summary: text,
    weeklyHours: z.number().min(1).max(60),
    goalDate: z.union([day, z.literal('')]),
    noticeDays: z.number().int().min(0).max(365),
    theme: z.enum(['system', 'light', 'dark']),
  })
  .strict();
export const stateSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    updatedAt: short,
    profile: profileSchema,
    tasks: z.array(taskSchema).max(5000),
    sessions: z.array(sessionSchema).max(20_000),
    questions: z.array(questionSchema).max(3000),
    attempts: z.array(attemptSchema).max(30_000),
    notes: z.array(noteSchema).max(5000),
    projects: z.array(projectSchema).max(500),
    claims: z.array(claimSchema).max(1000),
    stories: z.array(storySchema).max(500),
    jobs: z.array(jobSchema).max(1000),
    sources: z.array(sourceSchema).max(1000),
    gates: z.array(gateSchema).max(100),
  })
  .strict();
export type State = z.infer<typeof stateSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Track = z.infer<typeof track>;

export const operationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('session'), value: sessionSchema }).strict(),
  z.object({ kind: z.literal('attempt'), value: attemptSchema }).strict(),
  z.object({ kind: z.literal('note'), value: noteSchema }).strict(),
  z.object({ kind: z.literal('task'), value: taskSchema }).strict(),
  z.object({ kind: z.literal('project'), value: projectSchema }).strict(),
  z.object({ kind: z.literal('claim'), value: claimSchema }).strict(),
  z.object({ kind: z.literal('story'), value: storySchema }).strict(),
  z.object({ kind: z.literal('job'), value: jobSchema }).strict(),
  z.object({ kind: z.literal('source'), value: sourceSchema }).strict(),
  z.object({ kind: z.literal('gate'), value: gateSchema }).strict(),
  z.object({ kind: z.literal('question'), value: questionSchema }).strict(),
  z.object({ kind: z.literal('profile'), value: profileSchema }).strict(),
]);
export type Operation = z.infer<typeof operationSchema>;
export const proposalSchema = z
  .object({
    summary: z.string().min(1).max(3000),
    operations: z.array(operationSchema).min(1).max(30),
  })
  .strict();
export type Proposal = z.infer<typeof proposalSchema>;
export function validateReferences(state: State): State {
  const groups = [
    state.tasks,
    state.sessions,
    state.questions,
    state.attempts,
    state.notes,
    state.projects,
    state.claims,
    state.stories,
    state.jobs,
    state.sources,
    state.gates,
  ];
  for (const group of groups) {
    if (new Set(group.map((x) => x.id)).size !== group.length)
      throw new Error('Duplicate record IDs');
  }
  const tasks = new Map(state.tasks.map((t) => [t.id, t]));
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(task: Task) {
    if (visiting.has(task.id)) throw new Error('Task prerequisites contain a cycle');
    if (visited.has(task.id)) return;
    visiting.add(task.id);
    for (const dep of task.prerequisites) {
      if (!tasks.has(dep)) throw new Error('A prerequisite task does not exist');
      visit(tasks.get(dep)!);
    }
    visiting.delete(task.id);
    visited.add(task.id);
  }
  state.tasks.forEach(visit);
  for (const session of state.sessions)
    if (session.taskId && !tasks.has(session.taskId)) throw new Error('Linked task does not exist');
  const questions = new Set(state.questions.map((q) => q.id));
  for (const attempt of state.attempts)
    if (!questions.has(attempt.questionId)) throw new Error('Practice question does not exist');
  return state;
}
export function parseState(input: unknown): State {
  return validateReferences(stateSchema.parse(input));
}
export function applyOperations(current: State, ops: Operation[]): State {
  const next = structuredClone(current);
  const keys = {
    session: 'sessions',
    attempt: 'attempts',
    note: 'notes',
    task: 'tasks',
    project: 'projects',
    claim: 'claims',
    story: 'stories',
    job: 'jobs',
    source: 'sources',
    gate: 'gates',
    question: 'questions',
  } as const;
  for (const op of ops) {
    if (op.kind === 'profile') {
      next.profile = op.value;
      continue;
    }
    const list = next[keys[op.kind]] as Array<{ id: string }>;
    const found = list.findIndex((v) => v.id === op.value.id);
    if (found < 0) list.push(op.value);
    else list[found] = op.value;
    if (op.kind === 'attempt') {
      const question = next.questions.find((q) => q.id === op.value.questionId);
      if (question)
        question.status = op.value.result === 'Independent' ? 'Independent' : 'Learning';
    }
  }
  return parseState(next);
}
