import { describe, expect, it } from 'vitest';
import { createQuickVideoInfoSeed, getOEmbedEndpoint, parseQuickHtmlMetadata } from './video-info';

describe('quick video metadata', () => {
  it('creates an immediate YouTube thumbnail without a network request', () => {
    const seed = createQuickVideoInfoSeed('https://youtu.be/jNQXAC9IVRw?t=4');

    expect(seed).toMatchObject({
      id: 'jNQXAC9IVRw',
      title: 'YouTube video',
      uploader: 'YouTube',
      extractor: 'YouTube',
    });
    expect(seed.thumbnail).toContain('/jNQXAC9IVRw/');
  });

  it('extracts Open Graph metadata regardless of attribute order', () => {
    const metadata = parseQuickHtmlMetadata(`
      <html><head>
        <meta content="Fast &amp; Focused" property="og:title">
        <meta content="/poster.jpg" name="twitter:image">
        <meta property="og:site_name" content="Example Media">
      </head></html>
    `, 'https://example.com/watch/123');

    expect(metadata).toEqual({
      title: 'Fast & Focused',
      thumbnail: 'https://example.com/poster.jpg',
      uploader: 'Example Media',
    });
  });

  it('selects provider oEmbed endpoints only where they are public', () => {
    expect(getOEmbedEndpoint('https://www.youtube.com/watch?v=abc')).toContain('youtube.com/oembed');
    expect(getOEmbedEndpoint('https://vimeo.com/123')).toContain('vimeo.com/api/oembed.json');
    expect(getOEmbedEndpoint('https://example.com/video')).toBeUndefined();
  });
});
