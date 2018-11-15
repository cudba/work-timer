// @flow
import type { WorkTimerSettings } from '../work-timer/WorkSessionProvider';

const key = 'worktimer-settings';

const initialSettings: WorkTimerSettings = {
  timeOutThresholdSec: 15,
  activeCheckerIntervalSec: 5,
  tracking: false,
  showEvents: false,
  idleOnTimeOut: true,
  idleOnLock: false,
  autoLaunch: false
};
localStorage.setItem(key, JSON.stringify(initialSettings));

const workSessionSettings = {
  get(): WorkTimerSettings {
    const value = localStorage.getItem(key);
    if (!value) {
      throw new Error('No settings defined');
    }
    return JSON.parse(value);
  },
  updateSettings(workSessionSettings: $Shape<WorkTimerSettings>) {
    const currentSettings = this.get();
    if (currentSettings) {
      localStorage.setItem(
        key,
        JSON.stringify({ ...currentSettings, settings: workSessionSettings })
      );
    } else {
      localStorage.setItem(key, JSON.stringify(workSessionSettings));
    }
  },
  flushAll() {
    localStorage.removeItem(key)
  }
};
export default workSessionSettings;
