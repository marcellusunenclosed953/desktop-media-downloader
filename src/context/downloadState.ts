export interface DownloadStateRecord {
    url: string;
    status: string;
}

export const isTerminalDownload = (download: DownloadStateRecord): boolean => (
    download.status === 'completed' || download.status === 'error'
);

export const removeRelatedTerminalDownloads = <T extends DownloadStateRecord>(
    downloads: T[],
    sourceUrl: string
): T[] => downloads.filter(download => (
    download.url !== sourceUrl || !isTerminalDownload(download)
));

export const removeAllTerminalDownloads = <T extends DownloadStateRecord>(downloads: T[]): T[] => (
    downloads.filter(download => !isTerminalDownload(download))
);
