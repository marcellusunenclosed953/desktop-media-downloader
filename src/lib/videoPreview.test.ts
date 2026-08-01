import { describe, expect, it } from 'vitest';
import { createImmediateVideoPreview, isCompleteMediaUrl } from './videoPreview';

describe('immediate renderer video preview', () => {
    it('rejects incomplete URLs before starting metadata work', () => {
        expect(isCompleteMediaUrl('https://')).toBe(false);
        expect(isCompleteMediaUrl('https://youtu.be/jNQXAC9IVRw')).toBe(true);
    });

    it('builds a YouTube preview without IPC or network access', () => {
        const preview = createImmediateVideoPreview('https://www.youtube.com/watch?v=jNQXAC9IVRw&t=4');

        expect(preview).toMatchObject({
            id: 'jNQXAC9IVRw',
            title: 'YouTube video',
            uploader: 'YouTube',
            extractor: 'YouTube',
            isPartial: true,
        });
        expect(preview.thumbnail).toContain('/jNQXAC9IVRw/');
    });
});
