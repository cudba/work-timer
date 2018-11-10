// @flow
import moment from 'moment';
import { EventReason } from './WorkTimeProvider';
import type { WorkPeriod } from './WorkTimeProvider';

export default function(reason: $Values<typeof EventReason>): WorkPeriod {
  return {
    id: moment().toISOString(),
    startTime: moment().toISOString(),
    startReason: reason
  };
}
