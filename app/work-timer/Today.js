import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import StartTrackingIcon from '@material-ui/icons/PlayCircleOutline';
import StopTrackingIcon from '@material-ui/icons/PauseCircleOutline';
import { WorkTimeConsumer } from './WorkSessionProvider';
import WorkPeriodsTable from './WorkPeriodsTable';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/lab/Slider';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

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
          clearCurrentSession,
          activeCheckerIntervalSec,
          timeOutThresholdSec,
          idleOnLock,
          idleOnTimeOut,
          updateTimeOutThresholdSec,
          updateIdleOnTimeOut,
          updateIdleOnScreenLock
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
            <div style={{margin: '10px auto'}}>
              <FormControlLabel
                control={
                  <Switch
                    checked={idleOnLock}
                    onChange={event =>
                      updateIdleOnScreenLock(event.target.checked)
                    }
                  />
                }
                label="Set idle on screen lock"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={idleOnTimeOut}
                    onChange={event =>
                      updateIdleOnTimeOut(event.target.checked)
                    }
                  />
                }
                label="Set idle on time out"
              />
              {idleOnTimeOut && (
                <div style={{display: 'inline-block'}}>
                  <Typography style={{display: 'inline-block'}}>
                    Idle Time Out ({`${timeOutThresholdSec / 60} min`})
                  </Typography>
                  <Slider
                    max={15}
                    min={0}
                    style={{ width: 200, marginTop: 10 }}
                    value={timeOutThresholdSec / 60}
                    onChange={(event, value) =>
                      updateTimeOutThresholdSec(value.toFixed(0) * 60)
                    }
                  />
                </div>
              )}
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
