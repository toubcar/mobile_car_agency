/**
 * The Markdown of the pages written by the admin (Contenu > Pages), read without any library: titles (#, ##, ###),
 * paragraphs, lists (- or 1.), **bold**, *italic*, [links](/pages/annulation) and --- rules. Nothing else is
 * interpreted: the text stays text. Drawn by components/Markdown.tsx.
 */

export type Inline = { text: string; bold?: boolean; italic?: boolean; href?: string };

/** **bold**, *italic* / _italic_ and [text](href) in one line */
export function parseInline(line: string): Inline[] {
  const parts: Inline[] = [];
  // _italic_ only around words: snake_case_names stay as they are
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|(?<![A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    if (match.index > last) parts.push({ text: line.slice(last, match.index) });
    if (match[1] !== undefined) parts.push({ text: match[1], href: match[2] });
    else if (match[3] !== undefined) parts.push({ text: match[3], bold: true });
    else parts.push({ text: match[4] ?? match[5] ?? '', italic: true });
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return parts;
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'rule' };

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    if (list) blocks.push({ type: 'list', ...list });
    paragraph = [];
    list = null;
  };

  for (const raw of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);

    if (!line) {
      flush();
    } else if (/^(-{3,}|\*{3,})$/.test(line)) {
      flush();
      blocks.push({ type: 'rule' });
    } else if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] });
    } else if (bullet || numbered) {
      const ordered = !bullet;
      if (paragraph.length || (list && list.ordered !== ordered)) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (list) {
      // a wrapped list item
      list.items[list.items.length - 1] += ` ${line}`;
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
