import { describe, expect, it } from 'vitest';
import { removeAllTerminalDownloads, removeRelatedTerminalDownloads } from './downloadState';

const sourceUrl = 'https://www.youtube.com/watch?v=example';

describe('download/history state synchronization', () => {
    it('removes completed and failed records for the deleted history URL', () => {
        const downloads = [
            { id: 'completed', url: sourceUrl, status: 'completed' },
            { id: 'failed', url: sourceUrl, status: 'error' },
            { id: 'active', url: sourceUrl, status: 'downloading' },
            { id: 'other', url: 'https://example.com/other', status: 'completed' },
        ];

        expect(removeRelatedTerminalDownloads(downloads, sourceUrl).map(item => item.id)).toEqual([
            'active',
            'other',
        ]);
    });

    it('keeps active work when all history entries are cleared', () => {
        const downloads = [
            { id: 'pending', url: sourceUrl, status: 'pending' },
            { id: 'paused', url: sourceUrl, status: 'paused' },
            { id: 'completed', url: sourceUrl, status: 'completed' },
            { id: 'failed', url: sourceUrl, status: 'error' },
        ];

        expect(removeAllTerminalDownloads(downloads).map(item => item.id)).toEqual([
            'pending',
            'paused',
        ]);
    });
});
