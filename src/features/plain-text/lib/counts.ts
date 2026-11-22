/**
 * Word and character counts as people read them: words by the language's
 * word boundaries (so Chinese and Japanese count per word, not per run),
 * characters as user-perceived characters, without line breaks.
 */
export function countText(text: string, locale?: string) {
  const words = new Intl.Segmenter(locale, { granularity: "word" })
  const graphemes = new Intl.Segmenter(locale, { granularity: "grapheme" })
  let wordCount = 0
  for (const segment of words.segment(text)) if (segment.isWordLike) wordCount++
  let characters = 0
  for (const { segment } of graphemes.segment(text))
    if (segment !== "\n" && segment !== "\r\n" && segment !== "\r") characters++
  return { words: wordCount, characters }
}
