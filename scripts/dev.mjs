import {spawn} from 'node:child_process';
import fs from 'node:fs';
// Same-origin production-style development: build once, watch the server source on the local port.
const npm=process.platform==='win32'?'npm.cmd':'npm';
const build=spawn(npm,['run','build'],{stdio:'inherit',shell:process.platform==='win32'});
build.on('exit',code=>{if(code)return process.exit(code);const child=spawn(process.execPath,['--import','tsx','--watch','server/index.ts'],{stdio:'inherit',env:process.env});child.on('exit',c=>process.exit(c||0));process.on('SIGINT',()=>child.kill('SIGINT'));});
