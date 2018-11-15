import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import StartTrackingIcon from '@material-ui/icons/PlayCircleOutline';
import StopTrackingIcon from '@material-ui/icons/PauseCircleOutline';
import { WorkSessionConsumer } from './WorkSessionProvider';
import WorkPeriodsTable from './WorkPeriodsTable';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/lab/Slider';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

class Today extends React.Component {
  render() {
    return (
      <WorkSessionConsumer>
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
              height: '100%',
              overflow: 'hidden',
              fontSize: 14
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
            <div style={{ margin: '10px auto' }}>
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
                <div style={{ display: 'inline-block' }}>
                  <Typography style={{ display: 'inline-block' }}>
                    Idle after{' '}
                    {`${Math.trunc(
                      timeOutThresholdSec / 60
                    )} min ${((timeOutThresholdSec / 60) % 1) * 60} seconds`}
                  </Typography>
                  <Slider
                    max={15}
                    min={0.25}
                    step={0.25}
                    style={{ width: 200, marginTop: 10 }}
                    value={timeOutThresholdSec / 60}
                    onChange={(event, value) =>
                      updateTimeOutThresholdSec(value * 60)
                    }
                  />
                </div>
              )}
            </div>
            <div
              style={{
                margin: '40px 20px 20px 0px',
                float: 'right',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              {workPeriods.length ? (
                <Button variant="outlined" onClick={clearCurrentSession}>
                  clear
                </Button>
              ) : null}
            </div>
            <div
              style={{
                flex: 1,
                height: '100%',
                overflow: 'auto'
              }}
            >
              <WorkPeriodsTable
                tracking={tracking}
                workPeriods={workPeriods}
                updateWorkPeriod={updateWorkPeriod}
                mergeWorkPeriods={mergeWorkPeriods}
                deleteWorkPeriod={deleteWorkPeriod}
              />
            </div>
          </div>
        )}
      </WorkSessionConsumer>
    );
  }
}

export default Today;
