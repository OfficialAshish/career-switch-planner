import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { randomUUID } from 'node:crypto';
import { applyOperations, proposalSchema, type State, type Operation } from '../shared/schema.js';
import { planning, localDay, nextReview } from '../shared/planner.js';

const tables = [
  ['Tasks', 'task', 'tasks', ['id','title','track','estimateMinutes','status','prerequisites','evidence','priority','createdAt']],
  ['Sessions', 'session', 'sessions', ['id','date','minutes','track','summary','taskId']],
  ['Practice', 'question', 'questions', ['id','number','kind','title','pattern','difficulty','url','fallback','status','notes']],
  ['Attempts', 'attempt', 'attempts', ['id','questionId','date','result','minutes','notes','language']],
  ['Notes', 'note', 'notes', ['id','title','category','body','tags','attachments','updatedAt']],
  ['Projects', 'project', 'projects', ['id','title','status','summary','evidence','nextAction']],
  ['Claims', 'claim', 'claims', ['id','text','category','status','evidence']],
  ['Interview', 'story', 'stories', ['id','title','prompt','body','followups']],
  ['Applications', 'job', 'jobs', ['id','company','role','url','location','stage','jd','notes','nextAction']],
  ['Sources', 'source', 'sources', ['id','title','url','excerpt','checkedAt','notes']],
  ['Readiness', 'gate', 'gates', ['id','area','criteria','status','evidence']],
] as const;
const arrays = ['prerequisites','tags','attachments','followups'];
export async function workbook(state: State) {
  const w = new ExcelJS.Workbook(); w.creator = 'Career Switch Planner'; w.created = new Date();
  const guide = w.addWorksheet('Start here');
  guide.columns = [{width:27},{width:100}];
  guide.addRows([
    ['CAREER SWITCH PLANNER', 'Portable tracker • schema 1'],
    ['How to use', 'Upload XLSX to Google Drive, open with Google Sheets and save as Google Sheets. Each friend owns a separate copy; share viewer/commenter links.'],
    ['Import scope', 'Import matches sheet and header names below. Stable IDs update records; new IDs add records. Blank rows ignored. No deletion. Preview before applying.'],
    ['Important', 'Excel is a tracker exchange, not a full backup. Images and provider settings are not embedded. Use the JSON backup to move all workspace data and images.'],
    ['Lists', 'prerequisites, tags, attachments and followups use JSON arrays, e.g. ["python"]. Preserve IDs. Numeric/date values must retain their types.'],
    ['Formula safety', 'Formula cells are rejected on import. Text beginning = is exported as literal text. No macros or external workbook links are executed.'],
    ['Google Sheets', 'Import/export compatibility is designed around basic rows and formulas. Live Google import is not automated or verified here.'],
    ['Status', 'No invented practice or progress. Readiness gates require evidence. Dates are planning estimates, not job guarantees.'],
  ]);
  const d = w.addWorksheet('Dashboard'); d.columns=[{width:33},{width:28},{width:75}];
  const p=planning(state); const n=state.sessions.length+1;
  const sum=(track?:string)=> track ? `SUMIF(Sessions!D2:D${Math.max(2,n)},"${track}",Sessions!C2:C${Math.max(2,n)})/60` : `SUM(Sessions!C2:C${Math.max(2,n)})/60`;
  d.addRows([['YOUR CONTROL ROOM','Value','Meaning'],['Exported',localDay(),'Snapshot; app computes live weekly forecasts'],['Weekly capacity',state.profile.weeklyHours,'Hours, editable in app settings'],['All-time hours',{formula:sum(),result:state.sessions.reduce((a,s)=>a+s.minutes,0)/60},'Session time only; no double counting'],['This week',p.actualMinutes/60,'Monday-start local calendar week'],['Remaining work',p.remainingMinutes/60,'Hours, includes blocked work'],['Forecast',p.forecast||'—','Estimate only; depends on scope/capacity'],['Evidence gates',`${p.verifiedGates}/${state.gates.length}`,'Not an offer probability'],...['DSA','SQL','Backend','AI','Systems','Interview','Career'].map(t=>[`${t} total hours`,{formula:sum(t),result:state.sessions.filter(s=>s.track===t).reduce((a,s)=>a+s.minutes,0)/60},'All-time session hours'])]);
  for (const [name,,key,headers] of tables) {
    const s=w.addWorksheet(name); s.columns=headers.map(h=>({header:h,key:h,width:h==='id'?25: /body|text|summary|evidence|jd|excerpt|criteria|notes|fallback/.test(h)?65:/url/.test(h)?55:25}));
    for(const record of state[key]) s.addRow(Object.fromEntries(headers.map(h=>[h,Array.isArray((record as any)[h])?JSON.stringify((record as any)[h]):(record as any)[h]])));
    s.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,s.rowCount),column:headers.length}};
    s.views=[{state:'frozen',ySplit:1,xSplit:1}];
    if(name==='Tasks') for(let r=2;r<=Math.max(200,s.rowCount);r++) s.getCell(r,5).dataValidation={type:'list',allowBlank:false,formulae:['"todo,doing,done,blocked"']};
    if(name==='Practice') for(let r=2;r<=s.rowCount;r++) s.getCell(r,9).dataValidation={type:'list',allowBlank:false,formulae:['"Not started,Learning,Independent,Explain-ready"']};
    if(name==='Practice') { s.getCell(1,11).value='Next review (snapshot)'; s.getColumn(11).width=24; state.questions.forEach((q,i)=>s.getCell(i+2,11).value=nextReview(state,q)||''); }
  }
  for(const s of w.worksheets) {
    s.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'},size:12}; s.getRow(1).height=32;
    s.getRow(1).eachCell(c=>c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF245E7A'}});
    s.eachRow((r,i)=>{ if(i>1){r.height=s.name==='Start here'?58:48; r.eachCell(c=>{c.font={name:'Calibri',size:11,color:{argb:'FF203544'}}; c.alignment={vertical:'top',wrapText:true}; if(i%2===0)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F5F8'}}; if(typeof c.value==='number')c.numFmt='0.##';});} });
    s.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};
  }
  return Buffer.from(await w.xlsx.writeBuffer());
}
export function guardXlsx(buffer:Buffer) {
  // Read ZIP central directory before XML inflation. Reject ZIP64, encryption, extreme compression and excessive entries.
  let end=-1; for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){end=i;break;}
  if(end<0)throw new Error('Invalid XLSX ZIP container.');
  const count=buffer.readUInt16LE(end+10),offset=buffer.readUInt32LE(end+16);
  if(!count||count>500||offset>=buffer.length||count===65535)throw new Error('Workbook container exceeds limits.');
  let at=offset,total=0;
  for(let n=0;n<count;n++){
    if(at+46>buffer.length||buffer.readUInt32LE(at)!==0x02014b50)throw new Error('Invalid workbook directory.');
    const flags=buffer.readUInt16LE(at+8),compressed=buffer.readUInt32LE(at+20),inflated=buffer.readUInt32LE(at+24);
    if(flags&1||inflated===0xffffffff||compressed===0xffffffff)throw new Error('Encrypted/ZIP64 workbooks are not supported.');
    total+=inflated;if(total>40*1024*1024||inflated>20*1024*1024||inflated/Math.max(1,compressed)>250)throw new Error('Workbook inflated size or compression exceeds safe limits.');
    at+=46+buffer.readUInt16LE(at+28)+buffer.readUInt16LE(at+30)+buffer.readUInt16LE(at+32);
  }
}
export async function importWorkbook(buffer:Buffer,state:State) {
  // XLSX is parsed as data only. Resource limits are also enforced by request size and row count.
  guardXlsx(buffer); const w=new ExcelJS.Workbook(); await w.xlsx.load(buffer as any);
  const ops:Operation[]=[]; const warnings:string[]=[];
  for(const [name,kind,key,headers] of tables) {
    const s=w.getWorksheet(name); if(!s)continue;
    if(s.rowCount>20_001||s.columnCount>100)throw new Error('Workbook has too many rows or columns.');
    const indexes=new Map<string,number>(); s.getRow(1).eachCell((c,i)=>indexes.set(String(c.value),i));
    if(!headers.every(h=>indexes.has(h))){warnings.push(`${name}: headers do not match; sheet skipped.`);continue;}
    for(let i=2;i<=s.rowCount;i++) {
      const r=s.getRow(i); if(!r.getCell(indexes.get('id')!).value)continue;
      const value:any={};
      for(const h of headers) {
        const cell=r.getCell(indexes.get(h)!); let v:any=cell.value??'';
        if(typeof v==='object') {if(v instanceof Date)v=v.toISOString().slice(0,10);else if(v.hyperlink)v=v.text;else throw new Error(`${name} row ${i}: formulas/rich objects are not supported. Paste plain values.`);}
        if(arrays.includes(h)){try{v=JSON.parse(String(v)||'[]');}catch{throw new Error(`${name} row ${i}: ${h} needs a JSON array.`);}}
        if(['number','minutes','estimateMinutes'].includes(h))v=Number(v);
        value[h]=v;
      }
      const existing=(state[key] as any[]).find(v=>v.id===value.id);
      if(!existing||JSON.stringify(existing)!==JSON.stringify(value)) ops.push({kind,value} as Operation);
      if(ops.length>1000)throw new Error('Import at most 1,000 changed rows at once.');
    }
  }
  // Imports are allowed more than the AI's 30-op limit, but use the identical record validators.
  for(const op of ops)proposalSchema.parse({summary:'Workbook import',operations:[op]});
  applyOperations(state,ops);
  if(!ops.length)warnings.push('No supported changes found. Use an export from this app; legacy spreadsheets need manual mapping.');
  return {summary:`${ops.length} changed records from workbook`,operations:ops,warnings};
}
export function resumeText(state:State,future=false) {
  const p=state.profile; const claims=state.claims.filter(c=>future||c.status==='Verified');
  return [p.name||'Your name',p.headline,p.location,[p.email,p.phone,p.links].filter(Boolean).join(' | '),future?'FUTURE-STATE WORKING DRAFT — verify every claim before applying':'',p.summary,'EXPERIENCE',p.employment,...claims.filter(c=>c.category==='Experience').map(c=>`• ${c.text}`),'PROJECTS',...claims.filter(c=>c.category==='Project').map(c=>`• ${c.text}`),'SKILLS',...claims.filter(c=>c.category==='Skill').map(c=>c.text),'EDUCATION',p.education].filter(Boolean);
}
export async function resumeDocx(state:State,future:boolean) {
  const lines=resumeText(state,future); return Packer.toBuffer(new Document({sections:[{children:lines.map((t,i)=>new Paragraph({heading:i===0?HeadingLevel.TITLE:['EXPERIENCE','PROJECTS','SKILLS','EDUCATION'].includes(t)?HeadingLevel.HEADING_2:undefined,children:[new TextRun({text:t,size:i===0?36:21})],spacing:{after:120}}))}]}));
}
export function resumeLatex(state:State,future:boolean) {
  const escape=(s:string)=>s.replace(/[\\{}$&#%_^~]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','&':'\\&','#':'\\#','%':'\\%','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'}[c]!));
  return `\\documentclass[11pt,a4paper]{article}\n\\usepackage[margin=0.7in]{geometry}\n\\usepackage[T1]{fontenc}\n\\usepackage[utf8]{inputenc}\n\\begin{document}\n\\pagestyle{empty}\n${resumeText(state,future).map((s,i)=>i===0?`{\\LARGE\\bfseries ${escape(s)}}\\par\\medskip`:escape(s.replace(/^• /,'- '))+'\\par\\smallskip').join('\n')}\n\\end{document}\n`;
}
