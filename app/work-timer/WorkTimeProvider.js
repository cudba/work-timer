// @flow
import React, { Component } from 'react';
import saveAs from 'file-saver';
import moment from 'moment-timezone';
import memoize from 'memoize-one';
import * as _ from 'lodash';
import powerMonitor, { PowerMonitorEvent } from '../system/power-monitor';
import createReport from '../report/createReport';
import workSessionsCache from '../cache/work-sessions-cache';
import tray from '../system/tray';
import createWorkSession from './createWorkSession';
import createWorkPeriod from './createWorkPeriod';
import workSessionSettings from '../cache/work-session-settings';

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
  sessionId: string,
  tracking: boolean,
  working: boolean,
  idleTime: number,
  workPeriods: WorkPeriods,
  currentWorkPeriodId?: string
};

export type WorkSessions = {
  [name: string]: WorkSession
};

type Props = { children: any };

export const SettingsType = Object.freeze({
  idleOnTimeOut: 'idle-on-time-out',
  idleOnLock: 'idle-on-lock',
  timeOutThresholdSec: 'time-out-threshold-sec',
  activeCheckerIntervalSec: 'active-checker-interval-sec',
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

const initialSession: WorkSession = createWorkSession();

const { Consumer, Provider } = React.createContext();

export const WorkTimeConsumer = Consumer;

const getAllWorkPeriods = memoize((workPeriods: WorkPeriods) => {
  return Object.keys(workPeriods)
    .sort()
    .map(key => workPeriods[key]);
});

export default class WorkTimeProvider extends Component<Props, State> {
  idleTimerId = undefined;

  constructor(props: Props) {
    super(props);
    const settings = workSessionSettings.get();
    const todaysSession = workSessionsCache.getById(
      moment()
        .startOf('day')
        .toISOString()
    );
    if (todaysSession) {
      this.init({ ...settings, ...todaysSession });
    } else {
      this.init({ ...initialSession, ...settings });
    }
  }

  init(initialState: State) {
    const { tracking, working, idleOnTimeOut, idleOnLock } = initialState;
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
    this.state = initialState;

    tray.sync(tracking, idleOnTimeOut, idleOnLock);
    this.registerTrayListeners();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevState !== this.state) {
      workSessionsCache.put(this.state);
    }
  }

  componentWillUnmount() {
    this.stopIdleChecker();
    this.removeLockListeners();
  }

  changeSettings = (setting: $Values<typeof SettingsType>, value: any) => {
    switch (setting) {
      case SettingsType.idleOnTimeOut:
        return this.updateIdleOnTimeOut(value);
      case SettingsType.idleOnLock:
        return this.updateIdleOnScreenLock(value);
      case SettingsType.activeCheckerIntervalSec:
        return this.updateActiveCheckerIntervalSec(value);
      case SettingsType.timeOutThresholdSec:
        return this.updateTimeOutThresholdSec(value);
      case SettingsType.autoLaunch:
        return this.updateAutoLaunch(value);
      default:
    }
  };

  updateTimeOutThresholdSec(value: any) {
    this.setState({
      timeOutThresholdSec: value
    });
    workSessionSettings.updateSettings({ timeOutThresholdSec: value });
  }

  updateActiveCheckerIntervalSec(value: any) {
    this.setState({
      activeCheckerIntervalSec: value
    });
    workSessionSettings.updateSettings({ activeCheckerIntervalSec: value });
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
    workSessionSettings.updateSettings({ autoLaunch });
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
    this.setState(prevState => {
      const updatedState = {
        tracking: true,
        working: true,
        currentWorkPeriodId: workPeriod.id,
        workPeriods: {
          ...prevState.workPeriods,
          [workPeriod.id]: workPeriod
        }
      };
      workSessionsCache.update(this.state.sessionId, updatedState);
      return updatedState;
    });
  };

  stopWorkPeriod = (timeStamp: string, reason: $Values<typeof EventReason>) => {
    this.setState(prevState => {
      const { sessionId, workPeriods, currentWorkPeriodId } = prevState;
      if (currentWorkPeriodId) {
        const updatedState = {
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
        workSessionsCache.update(sessionId, updatedState);
        return updatedState;
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

  clearCurrentSession = () => {
    clearTimeout(this.idleTimerId);
    const updatedState = {
      idleTime: 0,
      workPeriods: {},
      tracking: false,
      working: false,
      currentWorkPeriodId: undefined
    };
    this.setState(updatedState);
    workSessionsCache.update(this.state.sessionId, updatedState);
  };

  exportReport = () => {
    const blob = createReport(this.getAllWorkPeriods());
    saveAs(blob, 'worktimer-report.txt');
  };

  getAllWorkPeriods = (): WorkPeriod[] => {
    const { workPeriods } = this.state;
    return getAllWorkPeriods(workPeriods);
  };

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
    workSessionSettings.updateSettings({ idleOnLock });
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
    workSessionSettings.updateSettings({ idleOnTimeOut });
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
      working,
      tracking,
      activeCheckerIntervalSec,
      timeOutThresholdSec,
      idleOnLock,
      idleOnTimeOut,
      autoLaunch
    } = this.state;
    return (
      <Provider
        value={{
          tracking,
          working,
          activeCheckerIntervalSec,
          timeOutThresholdSec,
          idleOnLock,
          idleOnTimeOut,
          autoLaunch,
          clearCurrentSession: this.clearCurrentSession,
          workPeriods: this.getAllWorkPeriods(),
          changeSettings: this.changeSettings,
          setTracking: this.setTracking
        }}
      >
        {this.props.children}
      </Provider>
    );
  }
}
