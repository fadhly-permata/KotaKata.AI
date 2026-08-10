import { writeFileSync } from 'node:fs';

const ac = new AbortController();
const timer = setTimeout(() => ac.abort(), 15000);

const t = async () => {
  try {
    const r = await fetch(
      'https://www.bing.com/search?q=%22terlelap%22+definisi&setlang=id&cc=ID',
      {
        signal: ac.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'id-ID,id;q=0.9',
        },
      },
    );
    const h = await r.text();
    const out = ['LEN ' + h.length];
    const ms = [...h.matchAll(/<p class="b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/g)]
      .map((m) =>
        m[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter((x) => x.length > 20)
      .slice(0, 8);
    out.push(JSON.stringify(ms, null, 1));
    out.push('---TITLE---');
    out.push(
      JSON.stringify(
        [...h.matchAll(/<h2><a[^>]*>([\s\S]*?)<\/a><\/h2>/g)]
          .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
          .slice(0, 6),
      ),
    );
    // also look for definition-ish text
    const defRe = /(?:definisi|arti kata)[^<]{0,80}/gi;
    out.push('---DEFMATCH---');
    out.push(JSON.stringify(h.match(defRe)?.slice(0, 5)));
    writeFileSync('/tmp/bing-out.txt', out.join('\n'));
  } catch (e) {
    writeFileSync('/tmp/bing-out.txt', 'ERR ' + e.message);
  } finally {
    clearTimeout(timer);
  }
};
t();
