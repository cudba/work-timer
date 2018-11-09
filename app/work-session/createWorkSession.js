// @flow
import * as moment from 'moment';
import type { WorkSession } from '../components/WorkTimer';

export default function(): WorkSession {
  return {
    id: moment()
      .startOf('day')
      .toISOString(),
    tracking: true,
    working: true,
    idleTime: 0,
    workPeriods: {}
  };
}
