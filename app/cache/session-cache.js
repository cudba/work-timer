// @flow


import type { TimeTrackingSession } from '../components/WorkTimer';

const key = 'work-periods';

const sessionCache = {
  get(id: number): TimeTrackingSession | null {
    const value = localStorage.getItem(key + id);
    if(value) {
      return JSON.parse(value)
    }
    return null
  },
  put(timeTrackingSession: TimeTrackingSession) {
    localStorage.setItem(key + timeTrackingSession.id, JSON.stringify(timeTrackingSession));
  },
  delete(id: number) {
    localStorage.removeItem(key + id)
  },

  flushAll() {
    localStorage.removeItem(key)
  },

}

export default sessionCache;
