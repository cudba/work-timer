import type { WorkTimerSettings } from '../components/WorkSessionProvider';

const key = 'worktimer-settings';
export default {
  getSettings(): WorkTimerSettings | null {
    const value = localStorage.getItem(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  },
  updateSettings(settings: $Shape<WorkTimerSettings>) {
    const currentSettings = this.getSettings();
    if (currentSettings) {
      localStorage.setItem(
        key,
        JSON.stringify({ ...currentSettings, settings })
      );
    } else {
      localStorage.setItem(key, JSON.stringify(settings));
    }
  }
};
