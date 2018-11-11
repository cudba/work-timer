// @flow
import moment from 'moment';
import type { WorkSession } from './WorkSessionProvider';

export default function(): WorkSession {
  return {
    sessionId: moment()
      .startOf('day')
      .toISOString(),
    tracking: true,
    working: true,
    idleTime: 0,
    workPeriods: {}
  };
}
