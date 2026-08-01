import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), '..');
const binDir = path.join(rootDir, 'bin');
const targetName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const targetPath = path.join(binDir, targetName);
const requestedVersion = process.env.YTDLP_VERSION?.trim() || '2026.07.04';
const releaseApiUrl = `https://api.github.com/repos/yt-dlp/yt-dlp/releases/tags/${requestedVersion}`;

const assetNameForPlatform = () => {
  if (process.platform === 'win32') {
    if (process.arch === 'arm64') return 'yt-dlp_arm64.exe';
    if (process.arch === 'x64') return 'yt-dlp.exe';
  }

  if (process.platform === 'darwin') {
    return 'yt-dlp_macos';
  }

  if (process.platform === 'linux') {
    if (process.arch === 'arm64') return 'yt-dlp_linux_aarch64';
    if (process.arch === 'arm') return 'yt-dlp_linux_armv7l';
    if (process.arch === 'x64') return 'yt-dlp_linux';
  }

  throw new Error(`Unsupported yt-dlp target: ${process.platform}/${process.arch}`);
};

const fetchOrThrow = async (url, accept = 'application/octet-stream') => {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      Accept: accept,
      'User-Agent': 'desktop-media-downloader-build',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while downloading ${url}`);
  }

  return response;
};

const getBinaryVersion = (binaryPath) => {
  if (!fs.existsSync(binaryPath)) return null;
  try {
    const probe = spawnSync(binaryPath, ['--version'], {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 15000,
    });
    return probe.status === 0 ? probe.stdout.trim() : null;
  } catch {
    return null;
  }
};

const getBundledVersion = () => getBinaryVersion(targetPath);

const downloadVerifiedBinary = async () => {
  const releaseResponse = await fetchOrThrow(releaseApiUrl, 'application/vnd.github+json');
  const release = await releaseResponse.json();
  const assetName = assetNameForPlatform();
  const binaryAsset = release.assets?.find((asset) => asset.name === assetName);
  const checksumAsset = release.assets?.find((asset) => asset.name === 'SHA2-256SUMS');

  if (!binaryAsset || !checksumAsset) {
    throw new Error(`Release ${requestedVersion} does not contain ${assetName} and SHA2-256SUMS`);
  }

  const [binaryResponse, checksumResponse] = await Promise.all([
    fetchOrThrow(binaryAsset.browser_download_url),
    fetchOrThrow(checksumAsset.browser_download_url, 'text/plain'),
  ]);

  const [binaryBuffer, checksumText] = await Promise.all([
    binaryResponse.arrayBuffer().then((value) => Buffer.from(value)),
    checksumResponse.text(),
  ]);

  const checksumLine = checksumText
    .split(/\r?\n/)
    .find((line) => line.trim().endsWith(assetName));
  const expectedHash = checksumLine?.trim().split(/\s+/)[0]?.toLowerCase();
  const actualHash = crypto.createHash('sha256').update(binaryBuffer).digest('hex');

  if (!expectedHash || expectedHash !== actualHash) {
    throw new Error(`Checksum verification failed for ${assetName}`);
  }

  fs.mkdirSync(binDir, { recursive: true });
  const temporaryPath = `${targetPath}.download`;
  fs.writeFileSync(temporaryPath, binaryBuffer, { mode: 0o755 });
  if (process.platform !== 'win32') {
    fs.chmodSync(temporaryPath, 0o755);
  }

  const installedVersion = getBinaryVersion(temporaryPath);
  if (installedVersion !== requestedVersion) {
    fs.rmSync(temporaryPath, { force: true });
    throw new Error(`Downloaded yt-dlp reported ${installedVersion || 'no version'} instead of ${requestedVersion}`);
  }

  fs.rmSync(targetPath, { force: true });
  fs.renameSync(temporaryPath, targetPath);

  console.log(`[prepare:yt-dlp] Bundled official ${assetName} (${installedVersion}) with verified SHA-256`);
};

const existingVersion = getBundledVersion();
if (existingVersion === requestedVersion) {
  console.log(`[prepare:yt-dlp] Bundled yt-dlp is current (${existingVersion})`);
} else {
  await downloadVerifiedBinary();
}
