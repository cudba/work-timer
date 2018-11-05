// @flow
import React, { Component } from 'react';
import saveAs from 'file-saver';
import * as moment from 'moment-timezone';

const electron = window.require('electron');

const EVENT_TYPE = Object.freeze({
  start: 'start',
  stop: 'stop'
});

const REASON = Object.freeze({
  idle: 'idle',
  active: 'active',
  suspend: 'suspended',
  lock: 'locked',
  shutdown: 'shutdown',
  resume: 'resume',
  unlock: 'unlock',
  user_action: 'user-action'
});

type WorkTimeEvent = {
  timeStamp: string,
  type: $Values<typeof EVENT_TYPE>,
  reason: $Values<typeof REASON>
};

type WorkPeriod = {
  startTime: Date,
  endTime: Date
};

type Props = {};
type State = {
  tracking: boolean,
  working: boolean,
  idleTime: number,
  events: WorkTimeEvent[],
  idleThresholdSec: number,
  activeCheckerIntervalSec: number,
  workPeriods: WorkPeriod[],
  currentWorkPeriod: WorkPeriod,
  showEvents: boolean
};

function stopEvent(timeStamp: string, reason: string) {
  return { timeStamp, type: EVENT_TYPE.stop, reason };
}

function startEvent(timeStamp: string, reason: string) {
  return { timeStamp, type: EVENT_TYPE.start, reason };
}
const initialState = {
  idleThresholdSec: 10,
  activeCheckerIntervalSec: 5,
  tracking: false,
  working: false,
  idleTime: 0,
  currentWorkPeriod: undefined,
  workPeriods: [],
  events: [],
  showEvents: false
};

export default class WorkTimer extends Component<Props, State> {
  state = initialState;
  idleTimerId = 0;

  constructor(props) {
    super(props);
    const persistedState = localStorage.getItem('workdays');
    if (persistedState != null) {
      this.state = JSON.parse(persistedState);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState !== this.state) {
      // todo: store per day
      localStorage.setItem('workdays', JSON.stringify(this.state));
    }
  }

  componentWillUnmount() {
    clearTimeout(this.idleTimerId);
  }

  exportReport = () => {
    const { workPeriods } = this.state;
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
    const blob = new Blob([workTimeReport], {
      type: 'text/plain;charset=utf-8'
    });
    saveAs(blob, 'worktimer-report.txt');
  };

  onShowEventsChange = event => {
    this.setState({
      showEvents: event.target.checked
    });
  };

  onIdleThresholdChange = event => {
    this.setState({
      idleThresholdSec: parseInt(event.target.value, 10) || 0
    });
  };

  onActiveCheckerIntervalChange = event => {
    this.setState({
      activeCheckerIntervalSec: parseInt(event.target.value, 10) || 0
    });
  };

  clear = () => {
    clearTimeout(this.idleTimerId);
    this.setState(initialState);
  };

  toggleTracking = () => {
    const { tracking } = this.state;
    if (tracking) {
      this.stopWorkPeriod(moment().toISOString(), REASON.user_action, false);
    } else {
      this.startWorkPeriod(moment().toISOString(), REASON.user_action);
    }
  };

  stopWorkPeriod = (timeStamp: string, reason: REASON, keepTracking = true) => {
    this.setState(prevState => {
      const { workPeriods, currentWorkPeriod, idleTime } = prevState;
      if (currentWorkPeriod) {
        return {
          tracking: keepTracking,
          working: false,
          workPeriods: [
            ...workPeriods,
            { startTime: currentWorkPeriod.startTime, endTime: timeStamp }
          ],
          idleTime: keepTracking ? idleTime : 0,
          currentWorkPeriod: undefined,
          events: [...prevState.events, stopEvent(timeStamp, reason)]
        };
      }
      return {
        tracking: keepTracking,
        working: false
      };
    });
    if (!keepTracking) {
      clearTimeout(this.idleTimerId);
    } else {
      this.setIdleCheckerChillMode();
    }
  };

  startWorkPeriod = (
    timeStamp: string,
    reason: REASON,
    currentIdleTime = 0
  ) => {
    this.setState(prevState => ({
      tracking: true,
      working: true,
      currentWorkPeriod: { startTime: timeStamp },
      events: [...prevState.events, startEvent(timeStamp, reason)]
    }));
    this.setIdleCheckerWorkMode(currentIdleTime);
  };

  setIdle = currentIdleTime => {
    // todo: substract idle time
    this.stopWorkPeriod(moment().toISOString(), REASON.idle);
  };

  setActive = currentIdleTime => {
    this.startWorkPeriod(moment().toISOString(), REASON.active, currentIdleTime);
  };

  checkIfIdle = () => {
    electron.remote.powerMonitor.querySystemIdleTime(currentIdleTime => {
      const { working, idleTime, idleThresholdSec } = this.state;

      this.setState({ idleTime: currentIdleTime });
      if (working) {
        if (currentIdleTime >= idleThresholdSec) {
          this.setIdle();
        } else {
          this.setIdleCheckerWorkMode(currentIdleTime);
        }
      } else if (currentIdleTime <= idleTime) {
        this.setActive(currentIdleTime);
      } else {
        this.setIdleCheckerChillMode();
      }
    });
  };

  setIdleCheckerChillMode = () => {
    const { activeCheckerIntervalSec } = this.state;
    this.idleTimerId = setTimeout(
      this.checkIfIdle,
      activeCheckerIntervalSec * 1000
    );
  };

  setIdleCheckerWorkMode = currentIdleTime => {
    const { idleThresholdSec } = this.state;
    this.idleTimerId = setTimeout(
      this.checkIfIdle,
      (idleThresholdSec - currentIdleTime) * 1000
    );
  };

  render() {
    const {
      idleTime,
      working,
      events,
      tracking,
      activeCheckerIntervalSec,
      idleThresholdSec,
      workPeriods,
      currentWorkPeriod,
      showEvents
    } = this.state;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '98vh',
          fontSize: 14
        }}
      >
        <div>
          <div>
            idle threshold in sec (time after you will be set to idle)
            <br />
            <input
              type="number"
              value={idleThresholdSec}
              onChange={this.onIdleThresholdChange}
            />
          </div>
          <div style={{ marginTop: 20 }}>
            active checker interval sec (interval to check if you are active
            again in idle state)
            <br />
            <input
              type="number"
              value={activeCheckerIntervalSec}
              onChange={this.onActiveCheckerIntervalChange}
            />
          </div>
          <div style={{ margin: '20px 0' }}>
            <div style={{ marginTop: 10 }}>
              <input
                type="checkbox"
                name="Show Events"
                value={showEvents}
                onChange={this.onShowEventsChange}
              />
              show events
            </div>
          </div>
          <div style={{ fontSize: 12 }}>
            <div>tracking: {tracking ? 'true' : 'false'}</div>
            <div>state: {working ? 'working' : 'chilling'}</div>
            <div>Idle time: {idleTime}</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={this.toggleTracking}>
            {tracking ? 'stop tracking' : 'start tracking'}
          </button>
          <button type="button" onClick={this.exportReport}>
            export
          </button>
          <button type="button" onClick={this.clear}>
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
                start time:{' '}
                {moment(workPeriod.startTime)
                  .tz('Europe/Zurich')
                  .format('YYYY-MM-DD HH:mm')}
                <br />
                end time:{' '}
                {moment(workPeriod.endTime)
                  .tz('Europe/Zurich')
                  .format('YYYY-MM-DD HH:mm')}
                <div>-----------------------------</div>
              </div>
            ))}
            {currentWorkPeriod ? (
              <div>
                start time:{' '}
                {moment(currentWorkPeriod.startTime)
                  .tz('Europe/Zurich')
                  .format('YYYY-MM-DD HH:mm')}
                <br />
                end time: running
              </div>
            ) : null}
          </div>
        </div>
        {showEvents ? (
          <>
            <div style={{ marginTop: 40 }}>Events:</div>
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
                {events.map(event => (
                  <div key={event.timeStamp}>
                    type: {event.type} <br />
                    time:{' '}
                    {moment(event.timeStamp)
                      .tz('Europe/Zurich')
                      .format('YYYY-MM-DD HH:mm:ss')}
                    <br />
                    reason: {event.reason}
                    <div>-----------------------------</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    );
  }
}
