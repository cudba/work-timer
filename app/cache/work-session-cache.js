// @flow


import type { State } from '../components/WorkTimer';

const key = 'work-periods';

const workSessionCache = {
  get(id: number): State | null {
    const value = localStorage.getItem(key + id);
    if(value) {
      return JSON.parse(value)
    }
    return null
  },
  put(timeTrackingSession: State) {
    localStorage.setItem(key + timeTrackingSession.id, JSON.stringify(timeTrackingSession));
  },
  delete(id: number) {
    localStorage.removeItem(key + id)
  },

  flushAll() {
    localStorage.removeItem(key)
  },

}

export default workSessionCache;
