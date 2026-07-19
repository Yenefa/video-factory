// Fetch Reddit r/Rag top posts via puppeteer-core + system Edge + proxy.
// Breaks Reddit's 403 anti-bot wall by using a real browser fingerprint.
// Output: .md files in D:\raw app\RawMaterialCollector\RAG\raw\
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'D:\\raw app\\RawMaterialCollector\\RAG\\raw';
const N = 14; // posts to fetch in detail
const LIST_URL = 'https://www.reddit.com/r/Rag/top/?t=all';

function slug(s, n = 70) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, n) || 'untitled';
}
function uniquePath(stem, ext) {
  let p = path.join(OUT, `${stem}.${ext}`);
  let i = 1;
  while (fs.existsSync(p)) { p = path.join(OUT, `${stem}-${i}.${ext}`); i++; }
  return p;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: EDGE,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox',
             '--proxy-server=http://127.0.0.1:7892']
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    // --- 1. List page: extract post permalinks ---
    console.log('list:', LIST_URL);
    try { await page.goto(LIST_URL, { waitUntil: 'networkidle2', timeout: 60000 }); }
    catch (e) { console.error('goto warn:', e.message); }
    await sleep(5000); // SPA render + proxy latency

    // scroll to trigger lazy-load of more posts
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(1000);

    const posts = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/comments/"]'));
      const seen = new Set();
      const out = [];
      for (const a of links) {
        const m = a.href.match(/\/r\/\w+\/comments\/[a-z0-9]+/i);
        if (!m) continue;
        const key = m[0];
        if (seen.has(key)) continue;
        seen.add(key);
        const title = (a.innerText || '').trim();
        if (title.length < 5) continue;
        out.push({ title, url: a.href });
      }
      return out;
    });
    console.log(`posts found: ${posts.length}`);

    if (posts.length === 0) {
      // debug: dump what we got
      const t = await page.evaluate(() => document.body ? document.body.innerText : '');
      console.log('--- PAGE TEXT (first 2500) ---');
      console.log(t.substring(0, 2500));
    }

    // --- 2. Each post detail page ---
    let count = 0;
    for (const post of posts.slice(0, N)) {
      try {
        console.log(`[${count + 1}/${Math.min(N, posts.length)}] ${post.url}`);
        await page.goto(post.url, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(4000); // render post + comments
        // scroll a bit to load top comments
        await page.evaluate(() => window.scrollTo(0, 800));
        await sleep(1500);
        const pageUrl = page.url();
        const text = await page.evaluate(
          () => document.body ? document.body.innerText : '');
        if (text.length < 400) {
          console.log('  too short, skip');
          continue;
        }
        const stem = 'reddit-' + slug(post.title);
        const p = uniquePath(stem, 'md');
        const header =
          `# ${post.title}\n\n` +
          `> Source: ${pageUrl}\n` +
          `> Fetched: 2026-07-20\n` +
          `> From: r/Rag top (puppeteer + Edge)\n\n---\n\n`;
        fs.writeFileSync(p, header + text + '\n', 'utf-8');
        count++;
        console.log(`  OK ${text.length} ch -> ${path.basename(p)}`);
      } catch (e) {
        console.log('  ERR', e.message);
      }
      await sleep(2200);
    }
    console.log(`\n=== reddit fetched: ${count} ===`);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    if (browser) await browser.close();
  }
})();
