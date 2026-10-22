import path from 'node:path';
import { Store } from './store.js';
import { Provider } from './ai.js';
import { createApp } from './app.js';
const port=Number(process.env.PORT||4317);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be an integer from 1024 to 65535.');
const store=new Store(path.resolve(process.env.CAREER_DATA_DIR||'data'));await store.init();
const provider=new Provider(store.root);await provider.init();
const server=createApp(store,provider,port).listen(port,'127.0.0.1',()=>console.log(`\nCareer Switch Planner is ready: http://127.0.0.1:${port}\nData stays in: ${store.root}\nKeep this window open. Press Ctrl+C to stop safely.\n`));
server.on('error',async()=>{console.error(`Could not start on port ${port}. Close the other server or set PORT to another port. Data was preserved.`);await store.close();process.exit(1);});
let stopping=false;function stop(){if(stopping)return;stopping=true;server.close(async()=>{await store.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
