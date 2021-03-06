# work-timer
Tracks your work time based on system idle state based on [Power Monitor](https://electronjs.org/docs/api/power-monitor)

## Install

First, clone the repo via git:

```bash
git clone git@github.com:cudba/work-timer.git work-timer 
```

And then install the dependencies with yarn.

```bash
$ cd work-timer
$ yarn
```

## Run


```bash
$ yarn dev
```

## Packaging

To package for the local platform:

```bash
$ yarn package
```

To package for all platforms:

First, refer to the [Multi Platform Build docs](https://www.electron.build/multi-platform-build) for dependencies.

Then,

```bash
$ yarn package-all
```

## Features
- [x] start / end work session on manual interaction
- [x] start / end work period based on active <=> idle state
- [x] start / end  work perdiod based on lock-screen <=> unlock-screen
- [x] start / end work period based on laptop suspended <=> resumed
- [x] export report in Eurotime format
- [ ] export between dates
- [ ] split workperiods per month
- [ ] review & change (merge, alter...) workperiods

