import {pathToFileURL} from 'node:url';
const {Marked} = await import(process.env.PAGES_MARKED ? pathToFileURL(process.env.PAGES_MARKED).href : 'marked');
let input = '';
for await (const chunk of process.stdin) input += chunk;
const documents = JSON.parse(input);
const result = {};
const escape = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for (const [path, text] of Object.entries(documents)) {
  const ids = new Map();
  const headings = [];
  const md = new Marked({gfm:true, renderer:{heading({tokens, depth}) {
    const content = this.parser.parseInline(tokens);
    const plain = content.replace(/<[^>]*>/g,'');
    const base = plain.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');
    const count = ids.get(base) || 0;
    ids.set(base, count + 1);
    const id = base + (count ? `-${count}` : '');
    if (depth === 2 || depth === 3) headings.push(`<li><a href="#${escape(id)}">${escape(plain)}</a></li>`);
    return `<h${depth} id="${escape(id)}">${content}</h${depth}>\n`;
  }}});
  result[path] = {body:md.parse(text),toc:headings.length?'<ul>'+headings.join('')+'</ul>':''};
}
process.stdout.write(JSON.stringify(result));
