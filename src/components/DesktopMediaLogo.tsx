import React from 'react';
import { cn } from '../lib/utils';

interface DesktopMediaLogoProps {
    className?: string;
    compact?: boolean;
}

const productMarkUrl = `${import.meta.env.BASE_URL}branding/desktop-media-downloader-icon.svg`;
const invertedProductMarkUrl = `${import.meta.env.BASE_URL}branding/desktop-media-downloader-icon-inverted.svg`;

const DesktopMediaLogo: React.FC<DesktopMediaLogoProps> = ({ className, compact = false }) => (
    <div className={cn('flex items-center gap-2.5', className)}>
        <div className="h-8 w-8 flex items-center justify-center">
            <img
                src={productMarkUrl}
                alt="Desktop Media Downloader"
                className="h-7 w-7 object-contain dark:hidden"
            />
            <img
                src={invertedProductMarkUrl}
                alt=""
                aria-hidden="true"
                className="hidden h-7 w-7 object-contain dark:block"
            />
        </div>
        {!compact && (
            <div className="leading-none">
                <p className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">Desktop Media Downloader</p>
                <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.16em] text-foreground/45">Desktop Utilities</p>
            </div>
        )}
    </div>
);

export default DesktopMediaLogo;
