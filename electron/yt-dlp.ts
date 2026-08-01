import { spawn, type ChildProcessWithoutNullStreams, type SpawnOptionsWithoutStdio } from 'node:child_process'

export const MIN_YOUTUBE_JS_NODE_MAJOR = 22
export const PROGRESS_PREFIX = 'desktop-media-progress'

export interface YtDlpRuntimeContext {
  executablePath: string
  nodeVersion: string
  isElectron: boolean
}

export interface ParsedProgress {
  progress: number
  speed?: string
  eta?: string
}

export interface DownloadFailureClassification {
  transient: boolean
  geoBlocked: boolean
  authRelated: boolean
  message: string
}

const getNodeMajor = (version: string): number => {
  const parsed = Number.parseInt(version.split('.')[0] || '', 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export const getDefaultRuntimeContext = (): YtDlpRuntimeContext => ({
  executablePath: process.execPath,
  nodeVersion: process.versions.node,
  isElectron: Boolean(process.versions.electron),
})

export const getYtDlpRuntimeConfig = (context: YtDlpRuntimeContext = getDefaultRuntimeContext()) => {
  const nodeMajor = getNodeMajor(context.nodeVersion)
  if (nodeMajor < MIN_YOUTUBE_JS_NODE_MAJOR) {
    return { args: [] as string[], env: {} as NodeJS.ProcessEnv, nodeMajor }
  }

  return {
    args: ['--js-runtimes', `node:${context.executablePath}`],
    env: context.isElectron ? { ELECTRON_RUN_AS_NODE: '1' } : {},
    nodeMajor,
  }
}

export const buildYtDlpArgs = (
  args: string[],
  context: YtDlpRuntimeContext = getDefaultRuntimeContext(),
): string[] => {
  const runtime = getYtDlpRuntimeConfig(context)
  return [
    '--ignore-config',
    '--no-colors',
    ...runtime.args,
    ...args,
  ]
}

export const spawnYtDlp = (
  executable: string,
  args: string[],
  options: SpawnOptionsWithoutStdio = {},
): ChildProcessWithoutNullStreams => {
  const runtime = getYtDlpRuntimeConfig()
  return spawn(executable, buildYtDlpArgs(args), {
    ...options,
    windowsHide: true,
    env: {
      ...process.env,
      ...options.env,
      ...runtime.env,
    },
  })
}

export const buildVideoFormatSelector = ({
  quality,
  ffmpegAvailable,
  directMedia = false,
}: {
  quality?: string
  ffmpegAvailable: boolean
  directMedia?: boolean
}): string => {
  if (directMedia) return 'b'

  const parsedQuality = Number.parseInt(quality || '', 10)
  const hasQualityLimit = Number.isFinite(parsedQuality) && parsedQuality > 0 && quality !== 'best'

  if (!ffmpegAvailable) {
    return hasQualityLimit
      ? `b[height<=${parsedQuality}]/b`
      : 'b'
  }

  return hasQualityLimit
    ? `bv*[height<=${parsedQuality}]+ba/b[height<=${parsedQuality}]/bv*+ba/b`
    : 'bv*+ba/b'
}

export const getProgressTemplateArgs = (): string[] => [
  '--progress-template',
  `download:${PROGRESS_PREFIX}\t%(progress.downloaded_bytes)s\t%(progress.total_bytes)s\t%(progress.total_bytes_estimate)s\t%(progress.speed)s\t%(progress.eta)s\t%(progress._percent_str)s`,
]

const formatSpeed = (bytesPerSecond: number): string | undefined => {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return undefined
  const units = ['B/s', 'KiB/s', 'MiB/s', 'GiB/s']
  let value = bytesPerSecond
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`
}

const formatEta = (seconds: number): string | undefined => {
  if (!Number.isFinite(seconds) || seconds < 0) return undefined
  const wholeSeconds = Math.round(seconds)
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
  const remainingSeconds = wholeSeconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

const parseProgressNumber = (value: string | undefined): number | undefined => {
  if (!value || value === 'NA' || value === 'None') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const parseYtDlpProgress = (line: string): ParsedProgress | null => {
  const markerIndex = line.indexOf(PROGRESS_PREFIX)
  if (markerIndex < 0) return null

  const fields = line.slice(markerIndex).trim().split('\t')
  if (fields[0] !== PROGRESS_PREFIX) return null

  const downloadedBytes = parseProgressNumber(fields[1])
  const totalBytes = parseProgressNumber(fields[2]) || parseProgressNumber(fields[3])
  const speed = parseProgressNumber(fields[4])
  const eta = parseProgressNumber(fields[5])
  const reportedPercent = Number.parseFloat((fields[6] || '').replace('%', '').trim())

  const calculatedPercent = downloadedBytes !== undefined && totalBytes !== undefined && totalBytes > 0
    ? (downloadedBytes / totalBytes) * 100
    : undefined
  const progress = calculatedPercent ?? (Number.isFinite(reportedPercent) ? reportedPercent : undefined)

  if (progress === undefined) {
    return null
  }

  return {
    progress: Math.max(0, Math.min(100, progress)),
    speed: formatSpeed(speed || 0),
    eta: formatEta(eta ?? -1),
  }
}

export const normalizeHttpUrl = (rawUrl: string): string => {
  if (typeof rawUrl !== 'string') throw new Error('URL must be a string')
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed.length > 4096) throw new Error('Enter a valid media URL')

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('Enter a valid media URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error('Only HTTP and HTTPS media URLs are supported')
  }

  return parsed.toString()
}

export const classifyDownloadFailure = (
  stderrText: string,
  code: number | null,
): DownloadFailureClassification => {
  const text = (stderrText || '').toLowerCase()

  const geoBlocked = /(not available in your country|geo.?restricted|geo.?blocked|this video is unavailable in your country|http error 451)/i.test(text)
  const authRelated = /(sign in|login|cookies|authentication|403 forbidden|http error 401|requested format is not available due to restrictions)/i.test(text)
  const transient = /(timed out|timeout|temporar|connection reset|network is unreachable|name or service not known|proxy error|tls|ssl|429 too many requests|http error 5\d\d|unable to download webpage)/i.test(text)

  if (/(no supported javascript runtime|external javascript runtime|ejs challenge|failed to solve|no video formats found)/i.test(text)) {
    return {
      transient: false,
      geoBlocked: false,
      authRelated,
      message: 'YouTube did not expose playable formats. Update yt-dlp and ensure its Node 22+ JavaScript runtime is available, then retry.',
    }
  }

  if (/(requested format is not available|requested format not available)/i.test(text)) {
    return {
      transient: false,
      geoBlocked: false,
      authRelated,
      message: 'The selected quality is not available for this video. Choose another quality or Best and retry.',
    }
  }

  if (geoBlocked) {
    return {
      transient: false,
      geoBlocked: true,
      authRelated,
      message: 'Download is geo-restricted for the current network location. Reconnect the same VPN/location used when starting the download, then resume.',
    }
  }

  if (authRelated) {
    return {
      transient,
      geoBlocked: false,
      authRelated: true,
      message: 'Download requires valid session cookies or account access. Revalidate the selected browser cookies and retry.',
    }
  }

  if (transient) {
    return {
      transient: true,
      geoBlocked: false,
      authRelated: false,
      message: 'Temporary network problem detected. Automatic retries were used; resume to continue from partial data.',
    }
  }

  const errorLine = stderrText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .reverse()
    .find((line) => /^error:/i.test(line))

  return {
    transient: false,
    geoBlocked: false,
    authRelated: false,
    message: errorLine?.replace(/^error:\s*/i, '').slice(0, 500) || `Download failed with code ${code}`,
  }
}
