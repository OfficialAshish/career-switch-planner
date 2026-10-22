import express from 'express';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { z } from 'zod';
import { Store, ConflictError } from './store.js';
import { Provider } from './ai.js';
import { quickLog } from './quick-log.js';
import { readPublicPage } from './research.js';
import { workbook,importWorkbook,resumeDocx,resumeLatex } from './exports.js';
import { saveImage,findImage,imageExtension } from './attachments.js';
import { applyOperations,operationSchema,parseState,id,type State } from '../shared/schema.js';
import { planning,localDay } from '../shared/planner.js';
import { modes } from '../shared/prompts.js';

export function createApp(store:Store,provider:Provider,port:number,webRoot=path.resolve('dist/web')) {
  const app=express(), csrf=randomBytes(32).toString('hex');app.disable('x-powered-by');
  const allowed=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
  app.use((req,res,next)=>{
    if(!allowed.has(req.headers.host||''))return res.status(403).json({error:'Use the local server URL.'});
    const origin=req.headers.origin;
    if(origin&&!allowed.has(origin.replace(/^http:\/\//,'')))return res.status(403).json({error:'Foreign origin blocked.'});
    if(req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Cross-site requests blocked.'});
    res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
    if(req.path.startsWith('/api')) {res.set('Cache-Control','no-store'); if(!['GET','HEAD'].includes(req.method)&&req.headers['x-career-token']!==csrf)return res.status(403).json({error:'Missing local request token. Reload this page.'});}
    next();
  });
  app.use(express.json({limit:'30mb',strict:true}));
  const expected=z.number().int().nonnegative();
  const ops=z.array(operationSchema).min(1).max(1000);
  app.get('/api/state',(_req,res)=>res.json({state:store.state,plan:planning(store.state),csrf,notice:store.notice}));
  app.post('/api/operations',async(req,res)=>{const b=z.object({revision:expected,operations:ops}).strict().parse(req.body);res.json(await store.apply(b.revision,b.operations));});
  app.post('/api/quick-log',(req,res)=>{const b=z.object({text:z.string().max(5000),date:z.string().optional()}).parse(req.body);res.json(quickLog(b.text,b.date||localDay(),store.state));});
  app.get('/api/provider',(_req,res)=>res.json(provider.info()));
  app.post('/api/provider',async(req,res)=>{const b=z.object({type:z.enum(['disabled','ollama','compatible']),endpoint:z.string().max(2048),model:z.string().max(300),apiKey:z.string().max(4096).optional(),clearKey:z.boolean().optional()}).strict().parse(req.body);await provider.configure(b);res.json(provider.info());});
  app.post('/api/ai',async(req,res)=>{const b=z.object({mode:z.enum(Object.keys(modes) as [keyof typeof modes,...(keyof typeof modes)[]]),text:z.string().min(1).max(20000),includeContext:z.boolean()}).strict().parse(req.body);const proposal=await provider.propose(b.mode,b.text,store.state,b.includeContext);applyOperations(store.state,proposal.operations);res.json(proposal);});
  let researchBusy=false;
  app.post('/api/research',async(req,res)=>{if(researchBusy)return res.status(429).json({error:'A source request is already running.'});const b=z.object({url:z.string().url().max(2048)}).strict().parse(req.body);researchBusy=true;try{res.json(await readPublicPage(b.url));}finally{researchBusy=false;}});
  app.get('/api/export.xlsx',async(_req,res)=>res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').attachment('career-tracker.xlsx').send(await workbook(store.state)));
  app.post('/api/import-xlsx',async(req,res)=>{const b=z.object({base64:z.string().max(16_000_000)}).strict().parse(req.body);const buffer=Buffer.from(b.base64,'base64');if(buffer.length>10*1024*1024)throw new Error('Workbook maximum 10 MB.');res.json(await importWorkbook(buffer,store.state));});
  app.get('/api/resume.docx',async(req,res)=>res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document').attachment('resume.docx').send(await resumeDocx(store.state,req.query.future==='true')));
  app.get('/api/resume.tex',(req,res)=>res.type('text/plain').attachment('resume.tex').send(resumeLatex(store.state,req.query.future==='true')));
  app.post('/api/images',async(req,res)=>{const b=z.object({base64:z.string().max(7_000_000)}).strict().parse(req.body);res.json({id:await saveImage(store.root,Buffer.from(b.base64,'base64'))});});
  app.get('/api/images/:id',async(req,res)=>{const f=await findImage(store.root,id.parse(req.params.id));res.sendFile(f);});
  app.get('/api/backup',async(_req,res)=>{
    const images:Record<string,string>={};const keys=new Set(store.state.notes.flatMap(n=>n.attachments));let size=0;
    for(const key of keys){const b=await fs.readFile(await findImage(store.root,key));size+=b.length;if(size>18*1024*1024)throw new Error('Portable backup exceeds 18 MB images; copy the data folder while the server is stopped instead.');images[key]=b.toString('base64');}
    res.attachment('workspace.career.json').json({format:'career-switch-planner',version:1,state:store.state,images});
  });
  function parseBackup(input:any) {
    const b=z.object({format:z.literal('career-switch-planner'),version:z.literal(1),state:z.unknown(),images:z.record(z.string(),z.string().max(7_000_000))}).strict().parse(input);
    const state=parseState(b.state);let total=0;
    for(const [key,value] of Object.entries(b.images)){id.parse(key);const buffer=Buffer.from(value,'base64');total+=buffer.length;if(buffer.length>5*1024*1024||total>18*1024*1024)throw new Error('Backup image limit exceeded.');imageExtension(buffer);}
    for(const key of state.notes.flatMap(n=>n.attachments))if(!b.images[key])throw new Error('Backup is missing an attached image.');
    return {state,images:b.images};
  }
  app.post('/api/import-backup/preview',(req,res)=>{const b=parseBackup(req.body);res.json({summary:`Replace workspace with ${b.state.tasks.length} tasks, ${b.state.sessions.length} sessions, ${b.state.notes.length} notes and ${Object.keys(b.images).length} images. Your current workspace is backed up first.`,revision:b.state.revision});});
  app.post('/api/import-backup/apply',async(req,res)=>{
    const body=z.object({revision:expected,backup:z.unknown()}).strict().parse(req.body);const b=parseBackup(body.backup);if(body.revision!==store.state.revision)throw new ConflictError('Workspace changed. Preview the import again.');
    // Remap image IDs so an import cannot overwrite images referenced by an older backup.
    const map=new Map<string,string>();for(const [key,value]of Object.entries(b.images))map.set(key,await saveImage(store.root,Buffer.from(value,'base64')));
    b.state.notes.forEach(n=>n.attachments=n.attachments.map(k=>map.get(k)!));res.json(await store.replace(body.revision,b.state));
  });
  app.get('/api/backups',async(_req,res)=>res.json(await store.backups()));
  app.post('/api/restore',async(req,res)=>{const b=z.object({revision:expected,file:z.string().regex(/^revision-\d+-\d+\.json$/)}).strict().parse(req.body);const next=parseState(JSON.parse(await fs.readFile(path.join(store.root,'backups',b.file),'utf8')));res.json(await store.replace(b.revision,next));});
  app.use(express.static(webRoot,{index:'index.html',dotfiles:'deny'}));
  app.use('/api',(_req,res)=>res.status(404).json({error:'Unknown API route.'}));
  app.get('/{*path}',(_req,res)=>res.sendFile(path.join(webRoot,'index.html')));
  app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    const status=err instanceof ConflictError?409:err instanceof z.ZodError?400:err.status===413?413:400;
    // Do not log request bodies, provider responses, credentials or raw validation input.
    res.status(status).json({error:err instanceof z.ZodError?err.issues.slice(0,4).map(i=>`${i.path.join('.')}: ${i.message}`).join('; '):String(err.message||'Operation failed').slice(0,600)});
  });return app;
}
