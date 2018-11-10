/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */

import AutoLaunch from 'auto-launch';
import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import trayIcon from './tray_icon.png';
import trayIconRecording from './tray_icon_recording.png';

const idleIcon = nativeImage.createFromDataURL(trayIcon);
const trackingIcon = nativeImage.createFromDataURL(trayIconRecording);

const startMinimized = (process.argv || []).indexOf('--hidden') !== -1;

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

const workTimerAutoLauncher = new AutoLaunch({
  name: 'Work Timer',
  path: '/Applications/WorkTimer.app',
  isHidden: true
});

function setAutoLaunch(enabled: boolean) {
  if (enabled) {
    workTimerAutoLauncher.enable();
  } else {
    workTimerAutoLauncher.disable();
  }
}

let mainWindow;
let tray ;
let trayContextMenu;

const contextMenuTemplate = [
  {
    label: 'Record',
    type: 'checkbox',
    checked: false,
    click: menuItem => {
      const track = menuItem.checked;
      mainWindow.webContents.send('on-tracking-change', track);
      setTracking(track);
    }
  },
  {
    label: 'Idle Settings',
    submenu: [
      {
        label: 'time out',
        type: 'checkbox',
        click: menuItem => {
          const checked = menuItem.checked;
          mainWindow.webContents.send('on-idle-on-time-out-change', checked);
        }
      },

      {
        label: 'screen lock',
        type: 'checkbox',
        click: menuItem => {
          const checked = menuItem.checked;
          mainWindow.webContents.send('on-idle-on-screen-lock-change', checked);
        }
      }
    ]
  },
  {
    label: 'Open',
    click: () => {
      mainWindow.show();
      mainWindow.focus();
    }
  },
  {
    label: 'Exit',
    click: () => {
      app.isQuiting = true;
      app.quit();
    }
  }
];

function setTracking(tracking) {
  trayContextMenu.items[0].checked = tracking;
  if (tracking) {
    tray.setImage(trackingIcon);
  } else {
    tray.setImage(idleIcon);
  }
  tray.setContextMenu(trayContextMenu);
}

function setIdleOnTimeOut(idleOnTimeOut: boolean) {
  trayContextMenu.items[1].submenu.items[0].checked = idleOnTimeOut;
  tray.setContextMenu(trayContextMenu);
}

function setIdleOnScreenLock(idleOnScreenLock: boolean) {
  trayContextMenu.items[1].submenu.items[1].checked = idleOnScreenLock;
  tray.setContextMenu(trayContextMenu);
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function attachRendererListeners() {
  ipcMain.on(
    'sync-tray',
    (event, { tracking, idleOnTimeOut, idleOnScreenLock }) => {
      setTracking(tracking);
      setIdleOnTimeOut(idleOnTimeOut);
      setIdleOnScreenLock(idleOnScreenLock);
    }
  );

  ipcMain.on('set-tracking', (event, tracking) => {
    setTracking(tracking);
  });
  ipcMain.on('set-idle-on-time-out', (event, idleOnTimeOut) => {
    setIdleOnTimeOut(idleOnTimeOut);
  });
  ipcMain.on('set-idle-on-screen-lock', (event, idleOnTimeOut) => {
    setIdleOnTimeOut(idleOnTimeOut);
  });
  ipcMain.on('set-auto-launch', (event, autoLaunch: boolean) => {
    setAutoLaunch(autoLaunch);
  });
}

app.on('ready', async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728
  });

  tray = new Tray(idleIcon);

  trayContextMenu = Menu.buildFromTemplate(contextMenuTemplate);

  tray.setToolTip('Work Timer');
  tray.setContextMenu(trayContextMenu);
  attachRendererListeners();

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED || startMinimized) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('minimize', event => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', event => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }

    return false;
  });
  // mainWindow.on('closed', () => {
  //   console.log('on close')
  //   mainWindow = null;
  // });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
});
