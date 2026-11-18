import type { ReactNode } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/api';
import { isRtlLocale } from '@/i18n';
import { parseBlocks, parseInline } from '@/utils/markdown';

/** Draws the Markdown of the admin's pages and help answers (parsed by utils/markdown). */
export default function Markdown({ source, onLink }: { source: string; onLink: (href: string) => void }) {
  const noItalic = isRtlLocale(); // Arabic has no italics

  const inline = (text: string): ReactNode =>
    parseInline(text).map((part, i) => (
      <Text
        key={i}
        style={[
          part.bold && styles.bold,
          part.italic && !noItalic && styles.italic,
          part.href ? styles.link : null,
        ]}
        onPress={part.href ? () => onLink(part.href!) : undefined}
        accessibilityRole={part.href ? 'link' : undefined}
      >
        {part.text}
      </Text>
    ));

  return (
    <View style={styles.root}>
      {parseBlocks(source).map((block, i) => {
        switch (block.type) {
          case 'heading':
            return <Text key={i} style={[styles.heading, styles[`h${block.level}`]]} accessibilityRole="header">{inline(block.text)}</Text>;
          case 'rule':
            return <View key={i} style={styles.rule} />;
          case 'list':
            return (
              <View key={i} style={styles.list}>
                {block.items.map((item, j) => (
                  <View key={j} style={styles.item}>
                    <Text style={styles.bullet}>{block.ordered ? `${j + 1}.` : '•'}</Text>
                    <Text style={styles.itemText}>{inline(item)}</Text>
                  </View>
                ))}
              </View>
            );
          default:
            return <Text key={i} style={styles.paragraph}>{inline(block.text)}</Text>;
        }
      })}
    </View>
  );
}


const styles = StyleSheet.create({
  root: { gap: 10 },
  heading: { color: '#0F172A', fontWeight: '800' },
  h1: { fontSize: 22, lineHeight: 30, marginBottom: 2 },
  h2: { fontSize: 17, lineHeight: 24, marginTop: 10 },
  h3: { fontSize: 15, lineHeight: 22, marginTop: 6 },
  paragraph: { fontSize: 15, lineHeight: 23, color: '#334155' },
  bold: { fontWeight: '700', color: '#0F172A' },
  italic: { fontStyle: 'italic' },
  link: { color: COLORS.secondary, textDecorationLine: 'underline', fontWeight: '600' },
  list: { gap: 6 },
  item: { flexDirection: 'row', gap: 8, paddingStart: 4 },
  bullet: { fontSize: 15, lineHeight: 23, color: COLORS.secondary, fontWeight: '700', minWidth: 14 },
  itemText: { flex: 1, fontSize: 15, lineHeight: 23, color: '#334155' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: '#CBD5E1', marginVertical: 8 },
});
