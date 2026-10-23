import type { State } from './schema.js';
export function texEscape(value: string) {
  return value.replace(
    /[\\{}$&#%_^~]/g,
    (c) =>
      ({
        '\\': '\\textbackslash{}',
        '{': '\\{',
        '}': '\\}',
        $: '\\$',
        '&': '\\&',
        '#': '\\#',
        '%': '\\%',
        _: '\\_',
        '^': '\\textasciicircum{}',
        '~': '\\textasciitilde{}',
      })[c]!,
  );
}
export function styledResume(state: State) {
  const p = state.profile;
  const claims = state.claims.filter((c) => c.status === 'Verified');
  return (
    String.raw`\documentclass[10pt,a4paper]{article}
\usepackage[margin=0.65in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{helvet}
\usepackage{xcolor}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\renewcommand{\familydefault}{\sfdefault}
\definecolor{heading}{HTML}{245E7A}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{3pt}
\setlist[itemize]{leftmargin=1.5em,itemsep=0pt,parsep=0pt,topsep=2pt}
\newcommand{\ressection}[1]{\par\vspace{6pt}{\color{heading}\bfseries #1}\par\vspace{2pt}}
\begin{document}
{\fontsize{24}{27}\selectfont\bfseries\color{heading} ` +
    texEscape(p.name || 'YOUR NAME') +
    String.raw`}\par
` +
    texEscape(p.location) +
    String.raw`\par
` +
    texEscape([p.email, p.phone].filter(Boolean).join(' | ')) +
    String.raw`\par
` +
    texEscape(p.links) +
    String.raw`
\ressection{PROFILE}
` +
    texEscape(p.summary) +
    String.raw`
\ressection{EXPERIENCE}
\textbf{` +
    texEscape(p.employment) +
    String.raw`}
` +
    list(claims.filter((c) => c.category === 'Experience').map((c) => c.text)) +
    String.raw`
\ressection{PROJECTS}
` +
    list(claims.filter((c) => c.category === 'Project').map((c) => c.text)) +
    String.raw`
\ressection{TECHNICAL SKILLS}
` +
    claims
      .filter((c) => c.category === 'Skill')
      .map((c) => texEscape(c.text) + String.raw`\par`)
      .join('\n') +
    String.raw`
\ressection{EDUCATION \& CERTIFICATIONS}
` +
    texEscape(p.education) +
    String.raw`
\end{document}
`
  );
}
function list(lines: string[]) {
  return lines.length
    ? '\\begin{itemize}\n' +
        lines.map((t) => '\\item ' + texEscape(t)).join('\n') +
        '\n\\end{itemize}'
    : '';
}
