import { ipcRenderer, contextBridge } from 'electron'

type DownloadEventListener<T> = (payload: T) => void

const subscribe = <T>(channel: string, listener: DownloadEventListener<T>) => {
  const wrapped = (_event: Electron.IpcRendererEvent, payload: T) => listener(payload)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  onDownloadProgress: (listener: DownloadEventListener<{ id: string; progress: number; speed?: string; eta?: string }>) =>
    subscribe('download-progress', listener),
  onDownloadComplete: (listener: DownloadEventListener<{ id: string }>) =>
    subscribe('download-complete', listener),
  onDownloadError: (listener: DownloadEventListener<{ id: string; error: string }>) =>
    subscribe('download-error', listener),

  getVideoInfo: (url: string, cookiesBrowser?: string) => ipcRenderer.invoke('get-video-info', url, cookiesBrowser),
  getVideoInfoFast: (url: string) => ipcRenderer.invoke('get-video-info-fast', url),
  startDownload: (options: any) => ipcRenderer.invoke('start-download', options),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  pauseDownload: (id: string) => ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('resume-download', id),
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
  openFolder: (folderPath?: string) => ipcRenderer.invoke('open-folder', folderPath),
  getDownloadLocation: () => ipcRenderer.invoke('get-download-location'),
  selectDownloadLocation: () => ipcRenderer.invoke('select-download-location'),
  pickDownloadLocationOnce: (initialPath?: string) => ipcRenderer.invoke('pick-download-location-once', initialPath),
  resetDownloadLocation: () => ipcRenderer.invoke('reset-download-location'),

  // Playlist/Channel functions
  getPlaylistInfo: (url: string) => ipcRenderer.invoke('get-playlist-info', url),

  // Search functions
  searchVideos: (query: string, platform: string, count: number) =>
    ipcRenderer.invoke('search-videos', query, platform, count),

  // Browser cookie functions (for authentication)
  getAvailableBrowsers: () => ipcRenderer.invoke('get-available-browsers'),
  validateBrowserCookies: (browser: string) => ipcRenderer.invoke('validate-browser-cookies', browser),

  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Setup wizard helpers
  getRuntimeDependenciesStatus: () => ipcRenderer.invoke('get-runtime-dependencies-status'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),

  // Notification settings
  updateNotificationSettings: (enabled: boolean) => ipcRenderer.invoke('update-notification-settings', enabled),
})
