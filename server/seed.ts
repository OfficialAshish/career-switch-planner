import { randomUUID } from 'node:crypto';
import catalog from '../seed/questions.json' with { type: 'json' };
import { parseState, type State, type Task, type Track } from '../shared/schema.js';
export function initialState(): State {
  const now = new Date().toISOString();
  const tasks: Task[] = [];
  function add(
    key: string,
    title: string,
    track: Track,
    hours: number,
    prerequisites: string[] = [],
    priority: 'core' | 'extension' = 'core',
  ) {
    tasks.push({
      id: key,
      title,
      track,
      estimateMinutes: Math.round(hours * 60),
      status: 'todo',
      prerequisites,
      evidence: '',
      priority,
      createdAt: now,
    });
  }
  add(
    'python',
    'Demonstrate Python collections, complexity and a timed coding baseline',
    'Backend',
    4,
  );
  const patterns = [...new Set(catalog.filter((q) => q.kind === 'DSA').map((q) => q.pattern))];
  patterns.forEach((pattern, i) =>
    add(
      `pattern-${i}`,
      `Practice + explain ${pattern}`,
      'DSA',
      pattern.includes('DP') ? 12 : 5,
      i === 0 ? ['python'] : i >= 12 ? ['pattern-10'] : [],
    ),
  );
  add('sql', 'SQL joins, NULLs, aggregation, windows and query-plan practice', 'SQL', 10);
  add('api', 'Build a validated API with clear error handling and tests', 'Backend', 6, ['python']);
  add(
    'auth',
    'Explain and test authentication, object authorization and token boundaries',
    'Backend',
    5,
    ['api'],
  );
  add('db', 'Practice schema constraints, transactions, indexes and migrations', 'Backend', 6, [
    'sql',
  ]);
  add(
    'retries',
    'Demonstrate bounded retries, idempotency and partial-failure reconciliation',
    'Backend',
    5,
    ['api'],
  );
  add('async', 'Explain asyncio, blocking I/O, threads/processes and cancellation', 'Backend', 4, [
    'python',
  ]);
  add('ops', 'Document logs, health checks, CI, deployment and recovery', 'Systems', 6, ['api']);
  add(
    'design',
    'Complete URL-shortener, rate-limiter and notification design mocks',
    'Systems',
    10,
    ['api', 'db'],
  );
  add('machine', 'Complete two runnable machine-coding exercises with tests', 'Backend', 8, [
    'python',
  ]);
  add('ai-basics', 'Compare structured outputs, tool calling, RAG and fine-tuning', 'AI', 5, [
    'api',
  ]);
  add('rag', 'Build retrieval with citations, no-answer behavior and evaluation cases', 'AI', 10, [
    'ai-basics',
  ]);
  add(
    'ai-safety',
    'Test tool permissions, injection resistance, cost and outage behavior',
    'AI',
    7,
    ['rag', 'auth'],
  );
  add('ai-evals', 'Run a versioned evaluation set and record failures, latency and cost', 'AI', 6, [
    'rag',
  ]);
  add(
    'mcp',
    'Explain MCP tool boundaries and implement a justified integration',
    'AI',
    5,
    ['ai-safety'],
    'extension',
  );
  add(
    'project-defense',
    'Run a clean project setup and defend three design trade-offs',
    'Interview',
    5,
    ['ops'],
  );
  add('rca', 'Write two real incident/problem-solving stories with evidence', 'Interview', 3);
  add('intro', 'Record a 90-second introduction and five unknown-answer styles', 'Interview', 2);
  add('mock', 'Complete two reviewed coding + design + behavioral mock loops', 'Interview', 6, [
    'intro',
    'design',
  ]);
  add('resume', 'Verify resume facts, ownership, links and metrics', 'Career', 3);
  add(
    'search',
    'Research role fit, location eligibility, workload and notice requirements',
    'Career',
    3,
    ['resume'],
  );
  const gates = [
    [
      'coding',
      'Coding',
      'Explain and independently solve representative unfamiliar easy/medium problems; test boundaries and complexity.',
    ],
    [
      'backend',
      'Backend',
      'Build and debug an API with validation, authorization, tests and reliable persistence.',
    ],
    [
      'database',
      'SQL / data',
      'Explain joins, NULLs, windows, transactions and an actual query plan.',
    ],
    [
      'applied-ai',
      'Applied AI',
      'Demonstrate bounded tools, evaluation, citations and failure handling in a real project.',
    ],
    [
      'design-gate',
      'Design',
      'Complete reviewed HLD and runnable machine-coding mocks with explicit trade-offs.',
    ],
    [
      'defense',
      'Project defense',
      'Run a clean setup and explain own contribution, limitations and test evidence.',
    ],
    [
      'communication',
      'Communication',
      'Recorded intro, two truthful problem-solving stories, unknown-answer practice and reviewed mocks.',
    ],
    [
      'integrity',
      'Resume integrity',
      'Verify titles/dates/claims/metrics and separate planned work from current achievements.',
    ],
    [
      'fit',
      'Role / availability',
      'Check country eligibility, coding ownership, workload, compensation structure and notice.',
    ],
  ];
  const stories = [
    [
      'intro',
      'Tell me about yourself',
      'A 90-second introduction',
      'Current role and real responsibilities → one engineering example → why the target role fits → invite a relevant follow-up. Fill actual details; do not invent experience.',
      ['What did you personally own?', 'Can you explain the architecture?'],
    ],
    [
      'incident',
      'Production incident / difficult bug',
      'Tell me about a serious problem you investigated',
      'Situation: [real symptom and impact]\nTask: [your responsibility]\nEvidence: [hypotheses and decisive observations]\nAction: [your work vs team actions]\nResult: [observed outcome]\nPrevention: [actual fix or proposed follow-up]',
      [
        'How did you rule out alternatives?',
        'What restored service?',
        'How would you detect it earlier?',
      ],
    ],
    [
      'unknown',
      'Five ways to handle an unknown',
      'Be honest and keep the conversation useful',
      '1. I have not worked with that yet; could you clarify the context?\n2. I understand the purpose, but have not implemented it; the detail I need to verify is…\n3. I do not recall the exact API; may I use pseudocode or check documentation?\n4. I do not have the optimized solution yet; here is a correct baseline and its bottleneck.\n5. I have not faced that scenario directly; here is how I would investigate it, not a claim that I already did.',
      ['Can you reason from first principles?', 'What would you validate first?'],
    ],
    [
      'leave',
      'Why are you switching?',
      'Stay positive and specific',
      'Explain what you learned in the current role, the engineering responsibilities you want next, and why this team fits. Discuss sustainable prioritization without attacking your employer.',
      ['Why this role?', 'What team environment helps you succeed?'],
    ],
  ];
  return parseState({
    schemaVersion: 1,
    revision: 0,
    updatedAt: now,
    profile: {
      name: '',
      headline: '',
      targetRole: 'Backend / applied AI engineer',
      location: '',
      email: '',
      phone: '',
      links: '',
      education: '',
      employment: '',
      summary: '',
      weeklyHours: 19,
      goalDate: '',
      noticeDays: 90,
      theme: 'system',
    },
    tasks,
    questions: catalog,
    sessions: [],
    attempts: [],
    notes: [],
    projects: [],
    claims: [],
    jobs: [],
    sources: [],
    stories: stories.map(([key, title, prompt, body, followups]) => ({
      id: String(key),
      title: String(title),
      prompt: String(prompt),
      body: String(body),
      followups,
    })),
    gates: gates.map(([key, area, criteria]) => ({
      id: key,
      area,
      criteria,
      status: 'Not started',
      evidence: '',
    })),
  });
}
