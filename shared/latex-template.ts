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

/** Compact, centered-name black-rule layout. Personal wording is always user-owned. */
export function classicResume(state: State) {
  const p = state.profile;
  const claims = state.claims.filter((c) => c.status === 'Verified');
  return (
    String.raw`% Compact classic template. Edit text, margins, font size and section spacing freely.
% Use \roleheading{Title}{Location | Dates} for right-aligned dates/links.
\documentclass[9pt,letterpaper]{extarticle}
\usepackage[margin=0.55in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{helvet}
\usepackage{xcolor,enumitem}
\usepackage[colorlinks=true,urlcolor=blue]{hyperref}
\renewcommand{\familydefault}{\sfdefault}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{2pt}
\setlist[itemize]{leftmargin=1.5em,itemsep=0pt,parsep=0pt,topsep=1pt}
\newcommand{\ressection}[1]{\par\vspace{6pt}\textbf{\MakeUppercase{#1}}\par\vspace{-4pt}\rule{\linewidth}{0.5pt}\par\vspace{1pt}}
\newcommand{\roleheading}[2]{\textbf{#1}\hfill{#2}\par}
\begin{document}
\begin{center}
{\fontsize{20}{22}\selectfont\bfseries ` +
    texEscape(p.name || 'YOUR NAME') +
    String.raw`}\\[2pt]
{\footnotesize ` +
    texEscape([p.email, p.phone, p.location, p.links].filter(Boolean).join(' | ')) +
    String.raw`}
\end{center}
\vspace{-8pt}
\ressection{Summary}
` +
    texEscape(p.summary) +
    String.raw`
\ressection{Experience}
\roleheading{` +
    texEscape(p.employment) +
    String.raw`}{}
` +
    list(claims.filter((c) => c.category === 'Experience').map((c) => c.text)) +
    String.raw`
\ressection{Projects}
% Example layout: \roleheading{Project name}{\href{https://example.org}{GitHub}}
` +
    list(claims.filter((c) => c.category === 'Project').map((c) => c.text)) +
    String.raw`
\ressection{Technical Skills}
` +
    claims
      .filter((c) => c.category === 'Skill')
      .map((c) => texEscape(c.text) + String.raw`\par`)
      .join('\n') +
    String.raw`
\ressection{Education \& Certifications}
` +
    texEscape(p.education) +
    String.raw`
\end{document}
`
  );
}
