# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [1.0.0] - 2026-08-01

### Added

- Cross-platform desktop downloads for video, audio, thumbnails, timestamp screenshots, and playlists.
- Quality and format selection with estimated sizes, persistent queues, retry controls, and download history.
- Fast staged media previews that show immediate URL details while provider metadata and full format information load in the background.
- Browser-cookie support for media the user is authorized to access.
- A checksum-verified bundled yt-dlp runtime with an included JavaScript runtime and graceful no-FFmpeg fallbacks.
- Native monochrome light and dark themes, a dedicated application icon, and localized interfaces in ten languages.
- First-run system checks, update notifications, release QA documentation, and automated installer builds for Windows, macOS, and Linux.

### Fixed

- Kept the Downloads list and home-page recent history synchronized when history entries are removed or cleared.
- Made history titles and thumbnails open their original media pages in the system browser.
- Replaced Electron's default application and notification icons with the Desktop Media Downloader identity.
- Hardened media extraction, format selection, progress reporting, cancellation, and error recovery.
