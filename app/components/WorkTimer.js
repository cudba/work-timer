// @flow
import React, { Component } from 'react';
import saveAs from 'file-saver';
import * as moment from 'moment-timezone';
import powerMonitor, { PowerMonitorEvent } from '../system/power-monitor';
import createReport from '../report/createReport';
import sessionCache from '../cache/session-cache';
import tray from '../system/tray';

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

export type WorkPeriod = {
  startTime: string,
  endTime?: string
};

type Props = {};
export type TimeTrackingSession = {
  id: number,
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
const initialState: TimeTrackingSession = {
  id: moment()
    .startOf('day')
    .milliseconds(),
  timeOutThresholdSec: 15,
  activeCheckerIntervalSec: 5,
  tracking: false,
  working: false,
  idleTime: 0,
  currentWorkPeriod: undefined,
  workPeriods: [],
  events: [],
  showEvents: false,
  setIdleOnTimeOut: true,
  setIdleOnLock: false
};

export default class WorkTimer extends Component<Props, TimeTrackingSession> {
  state = initialState;

  idleTimerId = undefined;

  componentDidMount() {
    const todaysSession = sessionCache.get(
      moment()
        .startOf('day')
        .milliseconds()
    );
    if (todaysSession) {
      this.init(todaysSession);
    } else {
      this.init(this.state)
    }
  }

  componentDidUpdate(prevProps: Props, prevState: TimeTrackingSession) {
    if (prevState !== this.state) {
      sessionCache.put(this.state);
    }
  }

  componentWillUnmount() {
    this.stopIdleChecker();
    this.removeLockListeners();
  }

  onShowEventsChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({
      showEvents: event.target.checked
    });
  };

  onSetIdleOnTimeOutChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    const setIdleOnTimeOut = event.target.checked;
    this.updateIdleOnTimeOut(setIdleOnTimeOut);
  };

  onSetIdleOnLockChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    const setIdleOnLock = event.target.checked;
    this.updateIdleOnScreenLock(setIdleOnLock);
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

  setLocked = () => {
    this.stopIdleChecker();
    this.stopWorkPeriod(moment().toISOString(), REASON.lock);
  };

  setUnlocked = () => {
    this.startWorkPeriod(moment().toISOString(), REASON.unlock);
    this.setIdleChecker(true);
  };

  setIdle = (currentIdleTime: number) => {
    this.stopWorkPeriod(
      moment()
        .subtract(currentIdleTime, 'seconds')
        .toISOString(),
      REASON.idle
    );
    this.setIdleChecker();
  };

  setActive = (currentIdleTime: number) => {
    this.startWorkPeriod(moment().toISOString(), REASON.active);
    this.setIdleChecker(true, currentIdleTime);
  };

  setIdleChecker(workMode: boolean = false, currentIdleTime: number = 0) {
    const { setIdleOnTimeOut } = this.state;
    if (setIdleOnTimeOut) {
      if (workMode) {
        this.setIdleCheckerWorkMode(currentIdleTime);
      } else {
        this.setIdleCheckerChillMode();
      }
    }
  }

  startWorkPeriod = (timeStamp: string, reason: $Values<typeof REASON>) => {
    this.setState(prevState => ({
      tracking: true,
      working: true,
      currentWorkPeriod: { startTime: timeStamp },
      events: [...prevState.events, startEvent(timeStamp, reason)]
    }));
  };

  stopWorkPeriod = (timeStamp: string, reason: $Values<typeof REASON>) => {
    this.setState(prevState => {
      const { workPeriods, currentWorkPeriod } = prevState;
      if (currentWorkPeriod) {
        return {
          working: false,
          workPeriods: [
            ...workPeriods,
            { startTime: currentWorkPeriod.startTime, endTime: timeStamp }
          ],
          currentWorkPeriod: undefined,
          events: [...prevState.events, stopEvent(timeStamp, reason)]
        };
      }
      return {
        working: false,
        events: [...prevState.events, stopEvent(timeStamp, reason)]
      };
    });
  };

  toggleTracking = () => {
    const { tracking } = this.state;
    if (tracking) {
      this.stopTracking();
      tray.setTracking(false)
    } else {
      tray.setTracking(true)
      this.startTracking();
    }
  };

  clear = () => {
    clearTimeout(this.idleTimerId);
    this.setState(initialState);
  };

  exportReport = () => {
    const { workPeriods } = this.state;
    const blob = createReport(workPeriods);
    saveAs(blob, 'worktimer-report.txt');
  };

  checkIfIdle = async () => {
    const currentIdleTime = await powerMonitor.getSystemIdleTime();
    this.setState({ idleTime: currentIdleTime });
    const { working, timeOutThresholdSec } = this.state;
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

  registerTrayListeners() {
    tray.onTrackingChange(track => {
      if (track) {
        this.startTracking();
      } else {
        this.stopTracking();
      }
    });

    tray.onIdleOnTimeOutChange(setIdleOnTimeOut => {
      this.updateIdleOnTimeOut(setIdleOnTimeOut);
    });

    tray.onIdleOnScreenLock(setIdleOnScreenLock => {
      this.updateIdleOnScreenLock(setIdleOnScreenLock);
    });
  }

  updateIdleOnScreenLock(setIdleOnLock: boolean) {
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
    tray.setIdleOnScreenLock(setIdleOnLock)
  }

  updateIdleOnTimeOut(setIdleOnTimeOut: boolean) {
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
    tray.setIdleOnTimeOut(setIdleOnTimeOut)
  }

  startTracking() {
    const { setIdleOnLock } = this.state;
    if (setIdleOnLock) {
      this.addLockListeners();
    }
    this.setIdleChecker(true);
    this.startWorkPeriod(moment().toISOString(), REASON.user_action);
    this.setState({ tracking: true });
  }

  stopTracking() {
    this.stopIdleChecker();
    this.removeLockListeners();
    this.stopWorkPeriod(moment().toISOString(), REASON.user_action);
    this.setState({ idleTime: 0, tracking: false });
  }

  init(state: TimeTrackingSession) {
    const { tracking, working, setIdleOnTimeOut, setIdleOnLock } = state;
    if (tracking) {
      if (setIdleOnTimeOut) {
        if (working) {
          this.setIdleCheckerWorkMode();
        } else {
          this.setIdleCheckerChillMode();
        }
      }
      if (setIdleOnLock) {
        this.addLockListeners();
      }
    }
    if(this.state !== state) {
      this.setState(state);
    }
    tray.sync(tracking, setIdleOnTimeOut, setIdleOnLock);
    this.registerTrayListeners();
  }

  addLockListeners() {
    powerMonitor.addListeners(PowerMonitorEvent.lock_screen, this.setLocked);
    powerMonitor.addListeners(
      PowerMonitorEvent.unlock_screen,
      this.setUnlocked
    );
  }

  stopIdleChecker() {
    clearTimeout(this.idleTimerId);
  }

  removeLockListeners() {
    powerMonitor.removeListener(
      PowerMonitorEvent.unlock_screen,
      this.setUnlocked
    );
    powerMonitor.removeListener(PowerMonitorEvent.lock_screen, this.setLocked);
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
      setIdleOnTimeOut
    } = this.state;
    return (
      <>
        <div style={{ fontSize: 12, position: 'absolute', right: 0, top: 0 }}>
          <div>tracking: {String(tracking)}</div>
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
              set idle on screen lock / suspense{' '}
              <span style={{ fontSize: 12 }}>
                (Suspending the pc also triggers a lock / unlock event)
              </span>
              <div style={{ fontSize: 12, margin: '5px 10px' }}>
                Note: If unchecked, idle-on-time-out rules apply
              </div>
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
