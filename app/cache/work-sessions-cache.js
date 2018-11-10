// @flow

import memoize from 'memoize-one';
import * as _ from 'lodash';
import type { WorkSession, WorkSessions } from '../work-timer/WorkTimeProvider';

const key = 'work-sessions';

const getAllWorkSessions = memoize((workSessions: WorkSessions) => {
  return Object.keys(workSessions)
    .sort()
    .map(key => workSessions[key]);
});

const workSessionsCache = {
  getByIds(): WorkSessions | null {
    const value = localStorage.getItem(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  },
  getAll(): WorkSession[] {
    const byIds = this.getByIds();
    if (byIds) {
      return getAllWorkSessions(byIds);
    }
    return [];
  },
  getById(id: number): WorkSession | null {
    const value = localStorage.getItem(key);
    if (value) {
      const workSessions = JSON.parse(value);
      return workSessions[id];
    }
    return null;
  },
  update(sessionId: string, workSession: $Shape<WorkSession>) {
    const sessions = this.getByIds();
    if (sessions) {
      localStorage.setItem(
        key,
        JSON.stringify({
          ...sessions,
          [sessionId]: _.merge(
            {},
            sessions[sessionId] || {},
            workSession
          )
        })
      );
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({ [sessionId]: workSession })
      );
    }
  },
  put(workSession: WorkSession) {
    const sessions = this.getByIds();
    if (sessions) {
      localStorage.setItem(
        key,
        JSON.stringify({ ...sessions, [workSession.sessionId]: workSession })
      );
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({ [workSession.sessionId]: workSession })
      );
    }
  },
  delete(id: string) {
    localStorage.removeItem(key + id);
  },

  flushAll() {
    localStorage.removeItem(key);
  }
};

export default workSessionsCache;
