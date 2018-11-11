// @flow
import moment from 'moment';
import { EventReason } from './WorkSessionProvider';
import type { WorkPeriod } from './WorkSessionProvider';

export default function(reason: $Values<typeof EventReason>): WorkPeriod {
  return {
    id: moment().toISOString(),
    startTime: moment().toISOString(),
    startReason: reason
  };
}
