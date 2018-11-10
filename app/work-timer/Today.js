import React from 'react';
import moment from 'moment-timezone';
import { WorkTimeConsumer } from './WorkTimeProvider';

class Today extends React.Component {
  render() {
    return (
      <WorkTimeConsumer>
        {({
      tracking,
      working,
      workPeriods,
      setTracking,
          clearCurrentSession
    }) => (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '95vh',
              fontSize: 14,
              paddingTop: 20
            }}
          >
            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={() => setTracking(!tracking)}>
                {tracking ? 'stop tracking' : 'start tracking'}
              </button>
              <button type="button" onClick={clearCurrentSession}>
                clear
              </button>
            </div>
            <div style={{ marginTop: 40 }}>Work periods:</div>
            <div style={{ flex: 1, marginTop: 20, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  overflow: 'auto'
                }}
              >
                {workPeriods.map(workPeriod => (
                  <div key={workPeriod.startTime}>
                    {`start time: ${moment(workPeriod.startTime)
                      .tz('Europe/Zurich')
                      .format('YYYY-MM-DD HH:mm')} (reason: ${workPeriod.startReason})`}
                    <br />
                    {
                      workPeriod.endTime ? `end time: ${moment(workPeriod.endTime)
                      .tz('Europe/Zurich')
                      .format('YYYY-MM-DD HH:mm')} (reason: ${workPeriod.startReason})` : 'running'

                    }
                    <div>-----------------------------</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </WorkTimeConsumer>
    );
  }
}

export default Today;
