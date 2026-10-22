import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',timeout:45000,workers:1,use:{baseURL:'http://127.0.0.1:4317',headless:true,launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',args:['--no-sandbox']},screenshot:'only-on-failure'},reporter:[['list'],['html',{open:'never'}]]});
