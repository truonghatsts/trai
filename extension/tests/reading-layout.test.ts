import { describe, expect, it } from 'vitest';
import { splitIntoLines } from '../src/shared/reading-layout.js';

describe('splitIntoLines', () => {
  it('preserves every input character while adding sentence boundaries', async () => {
    const fixtures = [
      'Hello! How are you? I am fine… Thank you.',
      'First line\nSecond line\n\nFourth line.',
      '  tabs\tand  spaces  ',
      '没有明确的句子边界',
      '😀 Καλημέρα — مرحبا — नमस्ते',
      '',
      '   \t  ',
    ];

    for (const fixture of fixtures) {
      const rendered = splitIntoLines(fixture);
      expect(rendered.replaceAll('\n', '')).toBe(fixture.replaceAll('\n', ''));
    }
  });

  it('splits common Unicode sentence punctuation, including closers', async () => {
    expect(splitIntoLines('One! Two? Three… Four。 五！ 六？')).toBe(
      'One!\n Two?\n Three…\n Four。\n 五！\n 六？',
    );
    expect(splitIntoLines('你好。世界！次の文？')).toBe('你好。\n世界！\n次の文？');
    expect(splitIntoLines('مرحبا؟ نعم. नमस्ते। अगला॥')).toBe('مرحبا؟\n نعم.\n नमस्ते।\n अगला॥');
    expect(splitIntoLines('He said, "Yes." Then left.')).toBe('He said, "Yes."\n Then left.');
    expect(splitIntoLines('Really?! Next.')).toBe('Really?!\n Next.');
  });

  it('does not split abbreviation-like periods, initials, decimals, or URLs', async () => {
    const abbreviations = [
      'mr.',
      'mrs.',
      'ms.',
      'dr.',
      'prof.',
      'st.',
      'vs.',
      'e.g.',
      'i.e.',
      'etc.',
      'approx.',
      'inc.',
      'ltd.',
      'u.s.',
      'u.k.',
    ];
    for (const abbreviation of abbreviations) {
      expect(splitIntoLines(`${abbreviation} follows. Next.`)).toBe(
        `${abbreviation} follows.\n Next.`,
      );
    }
    const text = 'Mr. Smith met Dr. Jones. J. Smith saw 3.14 today. Visit https://example.com. Next.';
    expect(splitIntoLines(text)).toBe(
      'Mr. Smith met Dr. Jones.\n J. Smith saw 3.14 today.\n Visit https://example.com. Next.',
    );
  });

  it('uses clause punctuation only for long spans without sentence boundaries', async () => {
    const long = `${'A'.repeat(90)}, ${'B'.repeat(90)}; ${'C'.repeat(90)}: done`;
    expect(splitIntoLines(long)).toBe(
      `${'A'.repeat(90)},\n ${'B'.repeat(90)};\n ${'C'.repeat(90)}:\n done`,
    );
    expect(splitIntoLines(`${'A'.repeat(180)}, still one span`)).toBe(
      `${'A'.repeat(180)}, still one span`,
    );
    expect(splitIntoLines(`${'A'.repeat(201)}, next`)).toBe(`${'A'.repeat(201)},\n next`);
  });

  it('preserves existing line breaks before applying sentence layout', async () => {
    expect(splitIntoLines('First.\nSecond without punctuation\n\nThird!')).toBe(
      'First.\nSecond without punctuation\n\nThird!',
    );
  });
});
