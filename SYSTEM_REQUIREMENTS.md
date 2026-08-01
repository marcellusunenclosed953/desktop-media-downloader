# System Requirements

Desktop Media Downloader installers are self-contained for normal video downloads. They include Electron, a supported Node.js runtime for YouTube challenge solving, and a checksum-verified official `yt-dlp` standalone binary.

## Installed App

- Windows 10 or newer, macOS 12 or newer, or a current x64 Linux distribution
- Internet access to the source media site
- `ffmpeg` is optional but recommended for merging separate high-quality video/audio streams, MP3 conversion, subtitles, metadata, thumbnails, and screenshots

If `ffmpeg` is absent, Desktop Media Downloader automatically selects a combined audio/video stream instead of starting a download that cannot be merged.

## Development and Packaging

- Node.js 24+
- npm 11+
- `ffmpeg` optional for end-to-end media conversion tests

`npm install` and `npm ci` automatically:

1. install the matching Electron runtime;
2. download the pinned official `yt-dlp` standalone build for the current platform and CPU;
3. verify the binary against the release's SHA-256 checksum.

No separate Python or system `yt-dlp` installation is required.

## Optional ffmpeg Installation

Windows:

```powershell
winget install Gyan.FFmpeg
```

macOS:

```bash
brew install ffmpeg
```

Debian/Ubuntu:

```bash
sudo apt update && sudo apt install -y ffmpeg
```

Fedora:

```bash
sudo dnf install -y ffmpeg
```

Arch:

```bash
sudo pacman -S --needed ffmpeg
```

## Setup and Verification

```bash
npm ci
npm run check
npm run dev
```

Build an installer for the current platform:

```bash
npm run build:bundled
```

Set `YTDLP_VERSION` only when intentionally testing a different official yt-dlp stable release.
