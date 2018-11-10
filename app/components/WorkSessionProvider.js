// @flow
import React, { Component } from 'react';
import saveAs from 'file-saver';
import moment from 'moment-timezone';
import * as _ from 'lodash';
import powerMonitor, { PowerMonitorEvent } from '../system/power-monitor';
import createReport from '../report/createReport';
import workSessionCache from '../cache/work-session-cache';
import tray from '../system/tray';
import createWorkSession from '../work-session/createWorkSession';
import createWorkPeriod from '../work-session/createWorkPeriod';

const EVENT_TYPE = Object.freeze({
  start: 'start',
  stop: 'stop'
});

export const EventReason = Object.freeze({
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
  reason: $Values<typeof EventReason>
};

export type WorkPeriod = {
  id: string,
  startTime: string,
  startReason: $Values<typeof EventReason>,
  endTime?: string,
  endReason?: $Values<typeof EventReason>
};

export type WorkPeriods = {
  [name: string]: WorkPeriod
};

export type WorkSession = {
  id: string,
  tracking: boolean,
  working: boolean,
  idleTime: number,
  workPeriods: WorkPeriods,
  currentWorkPeriodId?: string
};

type Props = {};

export const SettingsType = Object.freeze({
  tracking: 'tracking',
  idleOnTimeOut: 'idle-on-time-out',
  idleOnLock: 'idle-on-lock',
  timeOutThresholdSec: 'time-out-threshold-sec',
  activeCheckerIntervalSec: 'active-checker-interval-sec',
  showEvents: 'show-events',
  autoLaunch: 'auth-launch'
});

export type WorkTimerSettings = {
  tracking: boolean,
  idleOnTimeOut: boolean,
  idleOnLock: boolean,
  timeOutThresholdSec: number,
  activeCheckerIntervalSec: number,
  showEvents: boolean,
  autoLaunch: boolean
};

export type State = WorkTimerSettings & WorkSession;

const initialSettings: WorkTimerSettings = {
  timeOutThresholdSec: 15,
  activeCheckerIntervalSec: 5,
  tracking: false,
  showEvents: false,
  idleOnTimeOut: true,
  idleOnLock: false,
  autoLaunch: false
};
const initialSession: WorkSession = createWorkSession();

const initialState: State = {
  ...initialSession,
  ...initialSettings
};
const { Consumer, Provider } = React.createContext();

export default class WorkSessionProvider extends Component<Props, State> {
  state = initialState;

  idleTimerId = undefined;

  componentDidMount() {
    const todaysSession = workSessionCache.get(
      moment()
        .startOf('day')
        .milliseconds()
    );
    if (todaysSession) {
      this.init(todaysSession);
    } else {
      this.init(this.state);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevState !== this.state) {
      workSessionCache.put(this.state);
    }
  }

  componentWillUnmount() {
    this.stopIdleChecker();
    this.removeLockListeners();
  }

  changeSettings(setting: $Values<typeof SettingsType>, value: any) {
    switch (setting) {
      case SettingsType.idleOnTimeOut:
        return this.updateIdleOnTimeOut(value);
      case SettingsType.idleOnLock:
        return this.updateIdleOnScreenLock(value);
      case SettingsType.activeCheckerIntervalSec:
        return this.setState({
          activeCheckerIntervalSec: value
        });
      case SettingsType.timeOutThresholdSec:
        return this.setState({
          timeOutThresholdSec: value
        });
      case SettingsType.tracking:
        return this.setTracking(value);
      case SettingsType.showEvents:
        return this.setState({ showEvents: value });
      case SettingsType.autoLaunch:
        return this.updateAutoLaunch(value);
      default:
    }
  }

  onShowEventsChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    this.setState({
      showEvents: event.target.checked
    });
  };

  onidleOnTimeOutChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    const idleOnTimeOut = event.target.checked;
    this.updateIdleOnTimeOut(idleOnTimeOut);
  };

  onidleOnLockChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    const idleOnLock = event.target.checked;
    this.updateIdleOnScreenLock(idleOnLock);
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

  onAutoLaunchChange = (event: SyntheticInputEvent<HTMLInputElement>) => {
    const autoLaunch = event.target.checked;
    this.updateAutoLaunch(autoLaunch);
  };

  updateAutoLaunch(autoLaunch: boolean) {
    this.setState({
      autoLaunch
    });
    tray.setAutoLaunch(autoLaunch);
  }

  setLocked = () => {
    this.stopIdleChecker();
    this.stopWorkPeriod(moment().toISOString(), EventReason.lock);
  };

  setUnlocked = () => {
    this.startWorkPeriod(moment().toISOString(), EventReason.unlock);
    this.idleChecker(true);
  };

  idle = (currentIdleTime: number) => {
    this.stopWorkPeriod(
      moment()
        .subtract(currentIdleTime, 'seconds')
        .toISOString(),
      EventReason.idle
    );
    this.idleChecker();
  };

  setActive = (currentIdleTime: number) => {
    this.startWorkPeriod(moment().toISOString(), EventReason.active);
    this.idleChecker(true, currentIdleTime);
  };

  idleChecker(workMode: boolean = false, currentIdleTime: number = 0) {
    const { idleOnTimeOut } = this.state;
    if (idleOnTimeOut) {
      if (workMode) {
        this.idleCheckerWorkMode(currentIdleTime);
      } else {
        this.idleCheckerChillMode();
      }
    }
  }

  startWorkPeriod = (
    timeStamp: string,
    reason: $Values<typeof EventReason>
  ) => {
    const workPeriod = createWorkPeriod(reason);
    this.setState(prevState => ({
      tracking: true,
      working: true,
      currentWorkPeriodId: workPeriod.id,
      workPeriods: {
        ...prevState.workPeriods,
        [workPeriod.id]: workPeriod
      }
    }));
  };

  stopWorkPeriod = (timeStamp: string, reason: $Values<typeof EventReason>) => {
    this.setState(prevState => {
      const { workPeriods, currentWorkPeriodId } = prevState;
      if (currentWorkPeriodId) {
        return {
          working: false,
          workPeriods: {
            ...prevState.workPeriods,
            [currentWorkPeriodId]: _.merge(
              {},
              workPeriods[currentWorkPeriodId],
              { endTime: timeStamp, endReason: reason }
            )
          },
          currentWorkPeriodId: undefined
        };
      }
      return null;
    });
  };

  setTracking = (tracking: boolean) => {
    if (this.state.tracking !== tracking) {
      if (tracking) {
        tray.setTracking(true);
        this.startTracking();
      } else {
        this.stopTracking();
        tray.setTracking(false);
      }
    }
  };

  toggleTracking = () => {
    const { tracking } = this.state;
    if (tracking) {
      this.stopTracking();
      tray.setTracking(false);
    } else {
      tray.setTracking(true);
      this.startTracking();
    }
  };

  clear = () => {
    clearTimeout(this.idleTimerId);
    this.setState(initialState);
  };

  exportReport = () => {
    const blob = createReport(this.getAllWorkPeriods());
    saveAs(blob, 'worktimer-report.txt');
  };

  getAllWorkPeriods(): WorkPeriod[] {
    const { workPeriods } = this.state;
    return Object.keys(workPeriods).map(id => workPeriods[id]);
  }

  checkIfIdle = async () => {
    const currentIdleTime = await powerMonitor.getSystemIdleTime();
    this.setState({ idleTime: currentIdleTime });
    const { working, timeOutThresholdSec } = this.state;
    if (working) {
      if (currentIdleTime >= timeOutThresholdSec) {
        this.idle(currentIdleTime);
      } else {
        this.idleCheckerWorkMode(currentIdleTime);
      }
    } else if (currentIdleTime <= timeOutThresholdSec) {
      this.setActive(currentIdleTime);
    } else {
      this.idleCheckerChillMode();
    }
  };

  idleCheckerChillMode = () => {
    const { activeCheckerIntervalSec } = this.state;
    clearTimeout(this.idleTimerId);
    this.idleTimerId = setTimeout(
      this.checkIfIdle,
      activeCheckerIntervalSec * 1000
    );
  };

  idleCheckerWorkMode = (currentIdleTime: number = 0) => {
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

    tray.onIdleOnTimeOutChange(idleOnTimeOut => {
      this.updateIdleOnTimeOut(idleOnTimeOut);
    });

    tray.onIdleOnScreenLock(idleOnScreenLock => {
      this.updateIdleOnScreenLock(idleOnScreenLock);
    });
  }

  updateIdleOnScreenLock(idleOnLock: boolean) {
    const { working } = this.state;
    if (working) {
      if (idleOnLock) {
        this.addLockListeners();
      } else {
        this.removeLockListeners();
      }
    }
    this.setState({
      idleOnLock
    });
    tray.setIdleOnScreenLock(idleOnLock);
  }

  updateIdleOnTimeOut(idleOnTimeOut: boolean) {
    const { working } = this.state;
    if (working) {
      if (idleOnTimeOut) {
        this.idleCheckerWorkMode();
      } else {
        clearTimeout(this.idleTimerId);
      }
    }
    this.setState({
      idleOnTimeOut
    });
    tray.setIdleOnTimeOut(idleOnTimeOut);
  }

  startTracking() {
    const { idleOnLock } = this.state;
    if (idleOnLock) {
      this.addLockListeners();
    }
    this.idleChecker(true);
    this.startWorkPeriod(moment().toISOString(), EventReason.user_action);
    this.setState({ tracking: true });
  }

  stopTracking() {
    this.stopIdleChecker();
    this.removeLockListeners();
    this.stopWorkPeriod(moment().toISOString(), EventReason.user_action);
    this.setState({ idleTime: 0, tracking: false });
  }

  init(state: State) {
    const { tracking, working, idleOnTimeOut, idleOnLock } = state;
    if (tracking) {
      if (idleOnTimeOut) {
        if (working) {
          this.idleCheckerWorkMode();
        } else {
          this.idleCheckerChillMode();
        }
      }
      if (idleOnLock) {
        this.addLockListeners();
      }
    }
    if (this.state !== state) {
      this.setState(state);
    }
    tray.sync(tracking, idleOnTimeOut, idleOnLock);
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
      tracking,
      activeCheckerIntervalSec,
      timeOutThresholdSec,
      workPeriods,
      currentWorkPeriodId,
      showEvents,
      idleOnLock,
      idleOnTimeOut,
      autoLaunch
    } = this.state;
    return (
      <Provider value={this.state}>
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
                    checked={idleOnTimeOut}
                    onChange={this.onidleOnTimeOutChange}
                  />
                  set idle on time out
                </div>
                <div>
                  {idleOnTimeOut ? (
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
                  checked={idleOnLock}
                  onChange={this.onidleOnLockChange}
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
                  checked={autoLaunch}
                  onChange={this.onAutoLaunchChange}
                />
                launch on system start
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
                {this.getAllWorkPeriods().map(workPeriod => (
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
                {currentWorkPeriodId ? (
                  <div>
                    start time:{' '}
                    {moment(workPeriods[currentWorkPeriodId].startTime)
                      .tz('Europe/Zurich')
                      .format('YYYY-MM-DD HH:mm')}
                    <br />
                    end time: running
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      </Provider>
    );
  }
}
