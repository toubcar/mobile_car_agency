import { parseBlocks, parseInline } from '@/utils/markdown';
import { linkTarget } from '@/utils/siteLinks';

describe('the Markdown of the admin pages', () => {
  it('reads titles, paragraphs, lists and rules', () => {
    const blocks = parseBlocks('# Titre\n\n*Mise à jour*\n\n## 1. Objet\nUn texte\nsur deux lignes.\n\n- un\n- deux\n\n1. premier\n2. second\n\n---');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'heading', 'paragraph', 'list', 'list', 'rule']);
    expect(blocks[3]).toEqual({ type: 'paragraph', text: 'Un texte sur deux lignes.' });
    expect(blocks[4]).toEqual({ type: 'list', ordered: false, items: ['un', 'deux'] });
    expect(blocks[5]).toEqual({ type: 'list', ordered: true, items: ['premier', 'second'] });
  });

  it('reads bold, italic and links, and leaves snake_case alone', () => {
    expect(parseInline('Voir la [politique](/pages/annulation) **avant** de *payer*.')).toEqual([
      { text: 'Voir la ' },
      { text: 'politique', href: '/pages/annulation' },
      { text: ' ' },
      { text: 'avant', bold: true },
      { text: ' de ' },
      { text: 'payer', italic: true },
      { text: '.' },
    ]);
    expect(parseInline('la table toubcar_test_db')).toEqual([{ text: 'la table toubcar_test_db' }]);
  });
});

describe('links written by the admin', () => {
  const backend = 'https://toubcar.com';

  it('opens the app screen when the website page has one', () => {
    expect(linkTarget('/pages/annulation', backend)).toEqual({ kind: 'app', route: '/pages/annulation' });
    expect(linkTarget('/faq', backend)).toEqual({ kind: 'app', route: '/help' });
    expect(linkTarget('/cars/search?city=Rabat', backend)).toEqual({ kind: 'app', route: '/(tabs)/search?city=Rabat' });
    expect(linkTarget('https://toubcar.com/agencies/3/cars/15', backend)).toEqual({ kind: 'app', route: '/car/15' });
  });

  it('opens the browser otherwise', () => {
    expect(linkTarget('https://example.org/promo', backend)).toEqual({ kind: 'web', url: 'https://example.org/promo' });
    expect(linkTarget('/agency/register', backend)).toEqual({ kind: 'web', url: 'https://toubcar.com/agency/register' });
    expect(linkTarget('', backend)).toEqual({ kind: 'none' });
  });
});
