// @flow
import  moment from 'moment-timezone';

import type { WorkPeriod } from '../work-timer/WorkTimeProvider';

export default function createReport(workPeriods: WorkPeriod[]) {
  const dailyPeriods = workPeriods.reduce((reportPerDay, period) => {
    const key = moment(period.startTime).format('YYYY-MM-DD');
    reportPerDay[key] = reportPerDay[key]
      ? [...reportPerDay[key], period]
      : [period];
    return reportPerDay;
  }, {});

  const workTimeReport = Object.keys(dailyPeriods).reduce(
    (report, day) =>
      `${report}${day}: ${dailyPeriods[day].reduce(
        (dailyRaport, period) =>
          dailyRaport +
          moment(period.startTime)
            .tz('Europe/Zurich')
            .format('HHmm') +
          '\t' +
          moment(period.endTime)
            .tz('Europe/Zurich')
            .format('HHmm') +
          '\t',
        ''
      )}` + '\n',
    ''
  );
  return new Blob([workTimeReport], {
    type: 'text/plain;charset=utf-8'
  });
}
