export const HARD_LIMIT = 200;

const SENTENCE_TERMINATORS = new Set('!?…。！？؟։।॥۔．｡.');
const CLOSING_CHARS = new Set(`"'」』）)]}>”’】》〉`);
const ABBREVIATIONS = new Set([
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
]);
const CLAUSE_TERMINATORS = new Set(',;:，；：—');

function urlMask(line: string): Uint8Array {
  const mask = new Uint8Array(line.length);
  for (const match of line.matchAll(
    /(?:[a-z][a-z\d+.-]*:\/\/|www\.)\S+|\b(?:[\w-]+\.)+(?:com|org|net|edu|gov|io|co|dev|app|ai)\b[^\s]*/giu,
  )) {
    const start = match.index ?? 0;
    for (let index = start; index < start + match[0].length; index += 1) mask[index] = 1;
  }
  return mask;
}

function isProtectedPeriod(line: string, index: number, urls: Uint8Array): boolean {
  if (/\d/u.test(line[index - 1] ?? '') || urls[index] === 1) return true;
  const token = line
    .slice(Math.max(0, index - 7), index + 1)
    .match(/[A-Za-z](?:[A-Za-z.]*)\.$/u)?.[0];
  return token !== undefined && (ABBREVIATIONS.has(token.toLowerCase()) || /^[A-Z]\.$/u.test(token));
}

function sentenceBoundaryEnd(line: string, index: number, urls: Uint8Array): number | null {
  const mark = line[index];
  if (!mark || !SENTENCE_TERMINATORS.has(mark)) return null;

  let end = index;
  while (SENTENCE_TERMINATORS.has(line[end + 1] ?? '')) end += 1;
  while (CLOSING_CHARS.has(line[end + 1] ?? '')) end += 1;
  if (mark === '.' && isProtectedPeriod(line, end, urls)) return null;

  const next = line[end + 1];
  const noSpaceCjkBoundary =
    (mark === '。' || mark === '！' || mark === '？' || mark === '｡' || mark === '．') &&
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(next ?? '');
  if (next === undefined || /\s/u.test(next) || noSpaceCjkBoundary) return end;
  return null;
}

function splitAtBoundaries(line: string, boundaries: number[]): string {
  if (boundaries.length === 0) return line;
  let result = '';
  let start = 0;
  for (const end of boundaries) {
    result += line.slice(start, end + 1);
    if (end + 1 < line.length) result += '\n';
    start = end + 1;
  }
  return result + line.slice(start);
}

/** Display-only reading layout. Adds line breaks; never changes transcript text. */
export function splitIntoLines(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const urls = urlMask(line);
      const sentenceBoundaries: number[] = [];
      for (let index = 0; index < line.length; index += 1) {
        const end = sentenceBoundaryEnd(line, index, urls);
        if (end === null) continue;
        sentenceBoundaries.push(end);
        index = end;
      }
      if (sentenceBoundaries.length > 0) return splitAtBoundaries(line, sentenceBoundaries);
      if (line.length <= HARD_LIMIT) return line;

      const clauseBoundaries: number[] = [];
      for (let index = 0; index < line.length; index += 1) {
        if (!CLAUSE_TERMINATORS.has(line[index]) || urls[index] === 1) continue;
        if (/\s/u.test(line[index + 1] ?? '')) clauseBoundaries.push(index);
      }
      return splitAtBoundaries(line, clauseBoundaries);
    })
    .join('\n');
}
