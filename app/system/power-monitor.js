// @flow

const electron = window.require('electron');

export const PowerMonitorEvent = Object.freeze({
  lock_screen: 'lock-screen',
  unlock_screen: 'unlock-screen'
});

const powerMonitor = {
  addListeners(event: $Values<typeof PowerMonitorEvent>, listener: Function) {
    electron.remote.powerMonitor.addListener(event, listener);
  },
  removeListener(event: $Values<typeof PowerMonitorEvent>, listener: Function) {
    electron.remote.powerMonitor.removeListener(event, listener);
  },
  getSystemIdleTime(): Promise<number> {
    return new Promise(resolve => {
      electron.remote.powerMonitor.querySystemIdleTime(resolve);
    });
  }
};

export default powerMonitor;
