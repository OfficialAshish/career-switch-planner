import { boundedBody } from './network.js';
import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';
import * as cheerio from 'cheerio';
export function publicIPv4(ip: string): boolean {
  if (net.isIP(ip) !== 4) return false;
  const [a, b] = ip.split('.').map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && [0, 168].includes(b)) ||
    (a === 198 && [18, 19, 51].includes(b)) ||
    (a === 203 && b === 0)
  );
}
export async function fetchPublicHtml(
  raw: string,
  depth = 0,
): Promise<{ html: string; url: string }> {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || (u.port && u.port !== '443') || u.username || u.password)
    throw new Error('Research accepts public HTTPS URLs on port 443 without credentials.');
  const host = u.hostname.toLowerCase();
  if (
    !host.includes('.') ||
    ['.local', '.localhost', '.internal', '.test'].some((s) => host.endsWith(s))
  )
    throw new Error('Local and internal research addresses are blocked.');
  const addresses = await dns.lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => a.family === 4 && !publicIPv4(a.address)))
    throw new Error('Private/reserved destinations are blocked.');
  const chosen = addresses.find((a) => a.family === 4 && publicIPv4(a.address));
  if (!chosen) throw new Error('This reader currently requires a public IPv4 destination.');
  const result = await new Promise<{ body: string; redirect?: string }>((resolve, reject) => {
    const req = https.get(
      u,
      {
        headers: {
          'User-Agent': 'CareerSwitchPlanner/0.1 (user-requested source reader)',
          Accept: 'text/html,text/plain;q=0.9',
          'Accept-Encoding': 'identity',
        },
        signal: AbortSignal.timeout(12000),
        family: 4,
        lookup: (_hostname, _options, cb) => cb(null, chosen.address, 4),
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          resolve({ body: '', redirect: res.headers.location });
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Source returned HTTP ${res.statusCode}. Paste an excerpt instead.`));
          return;
        }
        if (
          !/^(text\/html|text\/plain|application\/xhtml\+xml)/i.test(
            res.headers['content-type'] || '',
          )
        ) {
          res.resume();
          reject(new Error('Only HTML/plain-text sources are supported.'));
          return;
        }
        const pieces: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk) => {
          size += chunk.length;
          if (size > 600_000) {
            req.destroy(new Error('Source exceeds 600 KB. Paste the relevant excerpt.'));
          } else pieces.push(chunk);
        });
        res.on('end', () => resolve({ body: Buffer.concat(pieces).toString('utf8') }));
        res.on('error', reject);
      },
    );
    req.setTimeout(10_000, () =>
      req.destroy(new Error('Source timed out. Paste an excerpt instead.')),
    );
    req.on('error', reject);
  });
  if (result.redirect) {
    if (depth >= 3) throw new Error('Too many redirects.');
    return fetchPublicHtml(new URL(result.redirect, u).href, depth + 1);
  }
  return { html: result.body, url: u.href };
}
export async function readPublicPage(raw: string) {
  const result = await fetchPublicHtml(raw);
  const u = new URL(result.url);
  const $ = cheerio.load(result.html);
  $('script,style,noscript,nav,footer,header,iframe,form').remove();
  const title = $('title').first().text().trim().slice(0, 300) || u.hostname;
  const body = $('article').length
    ? $('article').first().text()
    : $('main').length
      ? $('main').first().text()
      : $('body').text();
  return {
    title,
    url: u.href,
    excerpt: body.replace(/\s+/g, ' ').trim().slice(0, 18_000) || result.html.slice(0, 18_000),
  };
}

export type SearchResult = { title: string; url: string; snippet: string };
export async function searchWeb(query: string, key?: string): Promise<SearchResult[]> {
  if (key) {
    const response = await fetch(
      'https://api.search.brave.com/res/v1/web/search?q=' + encodeURIComponent(query) + '&count=5',
      {
        headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      },
    );
    if (!response.ok)
      throw new Error(
        `Search provider HTTP ${response.status}. Check the optional Brave search key.`,
      );
    const raw = (await boundedBody(response, 500000)).toString('utf8');
    if (raw.length > 500000) throw new Error('Search response too large.');
    const data = JSON.parse(raw);
    return (data.web?.results || [])
      .slice(0, 5)
      .map((r: any) => ({
        title: String(r.title || '').slice(0, 300),
        url: String(r.url || '').slice(0, 2048),
        snippet: String(r.description || '').slice(0, 500),
      }))
      .filter((r: SearchResult) => r.url.startsWith('https://'));
  }
  const { html } = await fetchPublicHtml(
    'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query),
  );
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  $('.result').each((_i, el) => {
    const a = $(el).find('.result__a').first();
    let href = a.attr('href') || '';
    try {
      const u = new URL(href, 'https://html.duckduckgo.com');
      href = u.searchParams.get('uddg') || u.href;
      const target = new URL(href);
      if (
        target.protocol === 'https:' &&
        !target.username &&
        !target.password &&
        results.length < 5
      )
        results.push({
          title: a.text().trim().slice(0, 300),
          url: target.href,
          snippet: $(el).find('.result__snippet').text().trim().slice(0, 500),
        });
    } catch {}
  });
  if (!results.length)
    throw new Error(
      'Search returned no readable results (possibly a bot challenge). Retry later or supply authoritative source URLs. No search evidence was invented.',
    );
  return results;
}
