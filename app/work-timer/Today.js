import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import StartTrackingIcon from '@material-ui/icons/PlayCircleOutline';
import StopTrackingIcon from '@material-ui/icons/PauseCircleOutline';
import { WorkTimeConsumer } from './WorkSessionProvider';
import WorkPeriodsTable from './WorkPeriodsTable';
import Typography from '@material-ui/core/Typography';

class Today extends React.Component {
  render() {
    return (
      <WorkTimeConsumer>
        {({
          tracking,
          working,
          workPeriods,
          updateWorkPeriod,
          mergeWorkPeriods,
          deleteWorkPeriod,
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
            <div style={{ margin: '10px auto' }}>
              <IconButton onClick={() => setTracking(!tracking)}>
                {tracking ? (
                  <StopTrackingIcon style={{ fontSize: 80 }} />
                ) : (
                  <StartTrackingIcon style={{ fontSize: 80 }} />
                )}
              </IconButton>
            </div>
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
                <WorkPeriodsTable
                  workPeriods={workPeriods}
                  updateWorkPeriod={updateWorkPeriod}
                  mergeWorkPeriods={mergeWorkPeriods}
                  deleteWorkPeriod={deleteWorkPeriod}
                  clear={clearCurrentSession}
                />
              </div>
            </div>
          </div>
        )}
      </WorkTimeConsumer>
    );
  }
}

export default Today;
