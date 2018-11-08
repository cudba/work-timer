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
  startTime: string,
  endTime?: string
};

type Props = {};
type State = {
  tracking: boolean,
  working: boolean,
  idleTime: number,
  events: WorkTimeEvent[],
  timeOutThresholdSec: number,
  activeCheckerIntervalSec: number,
  workPeriods: WorkPeriod[],
  currentWorkPeriod?: WorkPeriod,
  showEvents: boolean,
  setIdleOnTimeOut: boolean,
  setIdleOnSuspend: boolean,
  setIdleOnLock: boolean
};

function stopEvent(
  timeStamp: string,
  reason: $Values<typeof REASON>
): WorkTimeEvent {
  return { timeStamp, type: EVENT_TYPE.stop, reason };
}

function startEvent(timeStamp: string, reason: $Values<typeof REASON>) {
  return { timeStamp, type: EVENT_TYPE.start, reason };
}
const initialState: State = {
  timeOutThresholdSec: 600,
  activeCheckerIntervalSec: 300,
  tracking: false,
  working: false,
  idleTime: 0,
  currentWorkPeriod: undefined,
  workPeriods: [],
  events: [],
  showEvents: false,
  setIdleOnTimeOut: false,
  setIdleOnSuspend: false,
  setIdleOnLock: false
};

export default class WorkTimer extends Component<Props, State> {
  state = initialState;

  idleTimerId = undefined;

  componentDidMount() {
    const persistedState = localStorage.getItem('workdays');
    if (persistedState != null) {
      const prevState = JSON.parse(persistedState);
      this.init(prevState);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevState !== this.state) {
      // todo: store per day
      localStorage.setItem('workdays', JSON.stringify(this.state));
    }
  }

  componentWillUnmount() {
    clearTimeout(this.idleTimerId);
    this.removePowerMonitorListeners();
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

  onShowEventsChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({
      showEvents: event.target.checked
    });
  };

  onSetIdleOnTimeOutChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    const setIdleOnTimeOut = event.target.checked;
    const { working } = this.state;
    if (working) {
      if (setIdleOnTimeOut) {
        this.setIdleCheckerWorkMode();
      } else {
        clearTimeout(this.idleTimerId);
      }
    }
    this.setState({
      setIdleOnTimeOut
    });
  };

  onSetIdleOnLockChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    const setIdleOnLock = event.target.checked;
    const { working } = this.state;
    if (working) {
      if (setIdleOnLock) {
        this.addLockListeners();
      } else {
        this.removeLockListeners();
      }
    }
    this.setState({
      setIdleOnLock
    });
  };

  onSetIdleOnSuspendChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    const setIdleOnSuspend = event.target.checked;
    const { working } = this.state;
    if (working) {
      if (setIdleOnSuspend) {
        this.addSuspendListeners();
      } else {
        this.removeSuspendListeners();
      }
    }
    this.setState({
      setIdleOnSuspend
    });
  };

  onIdleThresholdChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({
      timeOutThresholdSec: parseInt(event.target.value, 10) || 0
    });
  };

  onActiveCheckerIntervalChange = (
    event: SyntheticInputEvent<HTMLInputElement>
  ) => {
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

  stopWorkPeriod = (
    timeStamp: string,
    reason: $Values<typeof REASON>,
    keepTracking: boolean = true
  ) => {
    if (!keepTracking) {
      clearTimeout(this.idleTimerId);
      this.removePowerMonitorListeners();
    } else {
      this.setIdleCheckerChillMode();
    }
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
        working: false,
        events: [...prevState.events, stopEvent(timeStamp, reason)]
      };
    });
  };

  startWorkPeriod = (
    timeStamp: string,
    reason: $Values<typeof REASON>,
    currentIdleTime: number = 0
  ) => {
    const { tracking, setIdleOnSuspend, setIdleOnLock } = this.state;
    if (!tracking) {
      if (setIdleOnLock) {
        this.addLockListeners();
      }
      if (setIdleOnSuspend) {
        this.addSuspendListeners();
      }
    }
    this.setIdleCheckerWorkMode(currentIdleTime);

    this.setState(prevState => ({
      tracking: true,
      working: true,
      currentWorkPeriod: { startTime: timeStamp },
      events: [...prevState.events, startEvent(timeStamp, reason)]
    }));
  };

  setSuspended = () => {
    this.stopWorkPeriod(moment().toISOString(), REASON.suspend);
  };

  setResumed = () => {
    this.startWorkPeriod(moment().toISOString(), REASON.resume);
  };

  setLocked = () => {
    this.stopWorkPeriod(moment().toISOString(), REASON.lock);
  };

  setUnlocked = () => {
    this.startWorkPeriod(moment().toISOString(), REASON.unlock);
  };

  setIdle = (currentIdleTime: number) => {
    this.stopWorkPeriod(
      moment()
        .subtract(currentIdleTime, 'seconds')
        .toISOString(),
      REASON.idle
    );
  };

  setActive = (currentIdleTime: number) => {
    this.startWorkPeriod(
      moment().toISOString(),
      REASON.active,
      currentIdleTime
    );
  };

  checkIfIdle = () => {
    electron.remote.powerMonitor.querySystemIdleTime(currentIdleTime => {
      const { working, timeOutThresholdSec } = this.state;

      this.setState({ idleTime: currentIdleTime });
      if (working) {
        if (currentIdleTime >= timeOutThresholdSec) {
          this.setIdle(currentIdleTime);
        } else {
          this.setIdleCheckerWorkMode(currentIdleTime);
        }
      } else if (currentIdleTime <= timeOutThresholdSec) {
        this.setActive(currentIdleTime);
      } else {
        this.setIdleCheckerChillMode();
      }
    });
  };

  setIdleCheckerChillMode = () => {
    const { activeCheckerIntervalSec } = this.state;
    clearTimeout(this.idleTimerId);
    this.idleTimerId = setTimeout(
      this.checkIfIdle,
      activeCheckerIntervalSec * 1000
    );
  };

  setIdleCheckerWorkMode = (currentIdleTime: number = 0) => {
    const { timeOutThresholdSec } = this.state;
    clearTimeout(this.idleTimerId);
    this.idleTimerId = setTimeout(
      this.checkIfIdle,
      (timeOutThresholdSec - currentIdleTime) * 1000
    );
  };

  init(state: State) {
    const {
      tracking,
      working,
      setIdleOnTimeOut,
      setIdleOnSuspend,
      setIdleOnLock
    } = state;
    if (tracking) {
      if (setIdleOnTimeOut) {
        if (working) {
          this.setIdleCheckerWorkMode();
        } else {
          this.setIdleCheckerChillMode();
        }
        if (setIdleOnLock) {
          this.addLockListeners();
        }
        if (setIdleOnSuspend) {
          this.addSuspendListeners();
        }
      }
    }
    this.setState(state);
  }

  addSuspendListeners() {
    electron.remote.powerMonitor.addListener('suspend', this.setSuspended);
    electron.remote.powerMonitor.addListener('resume', this.setResumed);
  }

  removeSuspendListeners() {
    electron.remote.powerMonitor.removeListener('suspend', this.setSuspended);
    electron.remote.powerMonitor.removeListener('resume', this.setResumed);
  }

  addLockListeners() {
    electron.remote.powerMonitor.addListener('unlock-screen', this.setUnlocked);
    electron.remote.powerMonitor.addListener('lock-screen', this.setLocked);
  }

  removeLockListeners() {
    electron.remote.powerMonitor.removeListener(
      'unlock-screen',
      this.setUnlocked
    );
    electron.remote.powerMonitor.removeListener('lock-screen', this.setLocked);
  }

  removePowerMonitorListeners() {
    this.removeLockListeners();
    this.removeSuspendListeners();
  }

  render() {
    const {
      idleTime,
      working,
      events,
      tracking,
      activeCheckerIntervalSec,
      timeOutThresholdSec,
      workPeriods,
      currentWorkPeriod,
      showEvents,
      setIdleOnLock,
      setIdleOnSuspend,
      setIdleOnTimeOut
    } = this.state;
    return (
      <>
        <div style={{ fontSize: 12, position: 'absolute', right: 0, top: 0 }}>
          <div>tracking: {tracking ? 'true' : 'false'}</div>
          <div>state: {working ? 'working' : 'chilling'}</div>
          <div>Idle time: {idleTime}</div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '95vh',
            fontSize: 14,
            paddingTop: 20
          }}
        >
          <div>
            <div>
              <div>
                <input
                  type="checkbox"
                  checked={setIdleOnTimeOut}
                  onChange={this.onSetIdleOnTimeOutChange}
                />
                set idle on time out
              </div>
              <div>
                {setIdleOnTimeOut ? (
                  <>
                    <div
                      style={{
                        display: 'inline-block',
                        marginRight: 10,
                        marginTop: 10
                      }}
                    >
                      <input
                        style={{ width: 40 }}
                        type="number"
                        value={timeOutThresholdSec}
                        onChange={this.onIdleThresholdChange}
                      />
                    </div>
                    <div style={{ display: 'inline-block' }}>
                      Time in seconds after you will be set to idle
                    </div>
                    <div>
                      <div
                        style={{
                          display: 'inline-block',
                          marginRight: 10,
                          marginTop: 10
                        }}
                      >
                        <input
                          style={{ width: 40 }}
                          type="number"
                          value={activeCheckerIntervalSec}
                          onChange={this.onActiveCheckerIntervalChange}
                        />
                      </div>
                      <div style={{ display: 'inline-block' }}>
                        Interval in seconds to check for user activity in idle
                        state
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            <div style={{ margin: '20px 0' }}>
              <input
                type="checkbox"
                checked={setIdleOnLock}
                onChange={this.onSetIdleOnLockChange}
              />
              set idle on screen lock (idle-on-time-out rules still apply)
            </div>
            <div style={{ margin: '20px 0' }}>
              <input
                type="checkbox"
                checked={setIdleOnSuspend}
                onChange={this.onSetIdleOnSuspendChange}
              />
              set idle on pc suspend
            </div>
            <div style={{ margin: '20px 0' }}>
              <input
                type="checkbox"
                checked={showEvents}
                onChange={this.onShowEventsChange}
              />
              show events
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
      </>
    );
  }
}
