export interface RichTextSpan {
  readonly text: string;
  readonly emphasis: 'none' | 'bold' | 'italic';
}

export interface RichText {
  readonly spans: readonly RichTextSpan[];
}

export function createRichTextFromPlainText(text: string): RichText {
  const paragraphs = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 0);
  const spans: RichTextSpan[] = [];

  for (const [index, paragraph] of paragraphs.entries()) {
    spans.push({
      text: paragraph.trim(),
      emphasis: 'none',
    });

    if (index < paragraphs.length - 1) {
      spans.push({ text: '\n\n', emphasis: 'none' });
    }
  }

  return { spans };
}

export function richTextToPlainText(richText: RichText): string {
  return richText.spans.map((span) => span.text).join('');
}

export function richTextFromSegments(segments: readonly { readonly text: string }[]): RichText {
  const spans: RichTextSpan[] = [];

  for (const [index, segment] of segments.entries()) {
    spans.push({ text: segment.text.trim(), emphasis: 'none' });
    if (index < segments.length - 1) {
      spans.push({ text: ' ', emphasis: 'none' });
    }
  }

  return { spans };
}
