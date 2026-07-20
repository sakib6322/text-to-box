import { describe, expect, it } from 'vitest';
import { formatSlideTemplate, levelsFromFlags, splitHtmlByHeadings } from './headingSlides';

describe('splitHtmlByHeadings', () => {
  it('splits Word-like H1 slides', () => {
    const html = '<h1>Nerve supply of Eye</h1><p>a</p><h1>Blood supply of eye</h1><p>b</p>';
    const slides = splitHtmlByHeadings(html, { levels: ['h1'] });
    expect(slides).toHaveLength(2);
    expect(slides[0].headingText).toBe('Nerve supply of Eye');
    expect(slides[1].headingText).toBe('Blood supply of eye');
  });

  it('respects H1+H2 config', () => {
    const mixed = '<h1>A</h1><p>x</p><h2>B</h2><p>y</p><h1>C</h1><p>z</p>';
    expect(splitHtmlByHeadings(mixed, { levels: ['h1'] })).toHaveLength(2);
    expect(splitHtmlByHeadings(mixed, { levels: levelsFromFlags(true, true, false) })).toHaveLength(3);
  });

  it('falls back to one slide without headings', () => {
    const slides = splitHtmlByHeadings('<p>only para</p>', { levels: ['h1'] });
    expect(slides).toHaveLength(1);
    expect(slides[0].headingTag).toBe('intro');
  });

  it('formats next label', () => {
    expect(formatSlideTemplate('{heading}', { next: 'Next', heading: 'Blood supply of eye' })).toBe(
      'Blood supply of eye',
    );
  });
});
