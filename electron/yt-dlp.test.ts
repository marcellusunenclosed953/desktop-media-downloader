import { describe, expect, it } from 'vitest'
import {
  buildVideoFormatSelector,
  buildYtDlpArgs,
  classifyDownloadFailure,
  getYtDlpRuntimeConfig,
  normalizeHttpUrl,
  parseYtDlpProgress,
} from './yt-dlp'

describe('yt-dlp runtime configuration', () => {
  it('enables the embedded Node runtime when it can run YouTube challenges', () => {
    const runtime = getYtDlpRuntimeConfig({
      executablePath: 'C:\\Program Files\\Desktop Media Downloader\\desktop-media-downloader.exe',
      nodeVersion: '24.4.0',
      isElectron: true,
    })

    expect(runtime.args).toEqual([
      '--js-runtimes',
      'node:C:\\Program Files\\Desktop Media Downloader\\desktop-media-downloader.exe',
    ])
    expect(runtime.env).toEqual({ ELECTRON_RUN_AS_NODE: '1' })
  })

  it('does not advertise an unsupported Node runtime', () => {
    const runtime = getYtDlpRuntimeConfig({
      executablePath: '/opt/desktop-media-downloader',
      nodeVersion: '20.18.0',
      isElectron: true,
    })

    expect(runtime.args).toEqual([])
    expect(runtime.env).toEqual({})
  })

  it('isolates downloads from user yt-dlp configuration', () => {
    const args = buildYtDlpArgs(['--version'], {
      executablePath: '/usr/bin/node',
      nodeVersion: '20.18.0',
      isElectron: false,
    })

    expect(args).toEqual(['--ignore-config', '--no-colors', '--version'])
  })
})

describe('video format selection', () => {
  it('uses separate best streams when ffmpeg is available', () => {
    expect(buildVideoFormatSelector({ quality: '1080', ffmpegAvailable: true }))
      .toBe('bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b')
  })

  it('uses a combined stream when ffmpeg is unavailable', () => {
    expect(buildVideoFormatSelector({ quality: '720', ffmpegAvailable: false }))
      .toBe('b[height<=720]/b')
    expect(buildVideoFormatSelector({ quality: 'best', ffmpegAvailable: false }))
      .toBe('b')
  })

  it('avoids extractor format ladders for direct media', () => {
    expect(buildVideoFormatSelector({ quality: '1080', ffmpegAvailable: true, directMedia: true }))
      .toBe('b')
  })
})

describe('progress parsing', () => {
  it('parses the stable progress template', () => {
    expect(parseYtDlpProgress('desktop-media-progress\t5242880\t10485760\tNA\t1048576\t5\t50.0%')).toEqual({
      progress: 50,
      speed: '1.0 MiB/s',
      eta: '0:05',
    })
  })

  it('ignores incomplete progress records', () => {
    expect(parseYtDlpProgress('desktop-media-progress\t0\tNA\tNA\tNA\tNA\tNA')).toBeNull()
    expect(parseYtDlpProgress('[download] 10%')).toBeNull()
  })

  it('uses yt-dlp reported percent when byte totals are unavailable', () => {
    expect(parseYtDlpProgress('desktop-media-progress\t1024\tNA\tNA\t2048\t4\t12.5%')).toEqual({
      progress: 12.5,
      speed: '2.0 KiB/s',
      eta: '0:04',
    })
  })
})

describe('request validation and errors', () => {
  it('accepts only normalized HTTP media URLs', () => {
    expect(normalizeHttpUrl(' https://youtu.be/jNQXAC9IVRw ')).toBe('https://youtu.be/jNQXAC9IVRw')
    expect(() => normalizeHttpUrl('file:///etc/passwd')).toThrow('Only HTTP and HTTPS')
    expect(() => normalizeHttpUrl('not a url')).toThrow('Enter a valid media URL')
  })

  it('gives actionable YouTube runtime failures', () => {
    const result = classifyDownloadFailure('ERROR: [youtube] No video formats found!', 1)
    expect(result.message).toContain('Node 22+')
  })

  it('preserves a useful extractor error instead of only returning an exit code', () => {
    const result = classifyDownloadFailure('warning\nERROR: This video is private', 1)
    expect(result.message).toBe('This video is private')
  })
})
