// @flow
import * as moment from 'moment';
import { EventReason } from '../components/WorkTimer';
import type { WorkPeriod } from '../components/WorkTimer';

export default function(reason: $Values<typeof EventReason>): WorkPeriod {
  return {
    id: moment().toISOString(),
    startTime: moment().toISOString(),
    startReason: reason
  };
}
