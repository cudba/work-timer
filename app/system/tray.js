// @flow
const { ipcRenderer } = window.require('electron');

export default {
  onTrackingChange(handler: (track: boolean) => void) {
    ipcRenderer.on('on-tracking-change', (event, message) => {
      handler(message);
    });
  },
  onIdleOnTimeOutChange(handler: (setIdleOnTimeOut: boolean) => void) {
    ipcRenderer.on('on-idle-on-time-out-change', (event, message) => {
      handler(message);
    });
  },
  onIdleOnScreenLock(handler: (setIdleOnScreenLock: boolean) => void) {
    ipcRenderer.on('on-idle-on-screen-lock-change', (event, message) => {
      handler(message);
    });
  },
  setTracking(tracking: boolean) {
    ipcRenderer.send('set-tracking', tracking);
  },
  setIdleOnTimeOut(idleOnTimeOut: boolean) {
    ipcRenderer.send('set-idle-on-time-out', idleOnTimeOut);
  },
  setIdleOnScreenLock(idleOnScreenLock: boolean) {
    ipcRenderer.send('set-idle-on-screen-lock', idleOnScreenLock);
  },
  sync(tracking: boolean, idleOnTimeOut: boolean, idleOnScreenLock: boolean) {
    ipcRenderer.send('sync-tray', {
      tracking,
      idleOnTimeOut,
      idleOnScreenLock
    });
  }
};
