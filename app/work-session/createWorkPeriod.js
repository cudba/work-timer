// @flow
import moment from 'moment';
import { EventReason } from '../components/WorkSessionProvider';
import type { WorkPeriod } from '../components/WorkSessionProvider';

export default function(reason: $Values<typeof EventReason>): WorkPeriod {
  return {
    id: moment().toISOString(),
    startTime: moment().toISOString(),
    startReason: reason
  };
}
