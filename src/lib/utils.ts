import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Run asynchronous work with a concurrency cap to avoid overwhelming IPC.
export async function runWithConcurrency<T>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<void>
) {
    const queue = [...items];
    const runners: Promise<void>[] = [];

    const runNext = async (): Promise<void> => {
        const next = queue.shift();
        if (next === undefined) return;
        await worker(next);
        await runNext();
    };

    for (let i = 0; i < Math.min(limit, items.length); i += 1) {
        runners.push(runNext());
    }

    await Promise.all(runners);
}
