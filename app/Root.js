// @flow
import React, { Component } from 'react';
import moment from 'moment-timezone';
import { Provider } from 'react-redux';
import type { Store } from './reducers/types';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import MomentUtils from '@date-io/moment';
import WorkTimer from './work-timer/WorkTimer';
import WorkSessionProvider from './work-timer/WorkSessionProvider';
import MuiPickersUtilsProvider from 'material-ui-pickers/MuiPickersUtilsProvider';

moment.tz.setDefault('Europe/Zurich');

const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#383e47'
    },
    secondary: {
      main: '#388e3c'
    }
  },
  overrides: {
    MuiSlider: {
      track: { backgroundColor: '#388e3c' },
      thumb: { backgroundColor: '#388e3c' },
    },
  }
});
type Props = {
  store: Store,
  history: {}
};

export default class Root extends Component<Props> {
  render() {
    const { store } = this.props;
    return (
      <Provider store={store}>
        <MuiThemeProvider theme={theme}>
          <MuiPickersUtilsProvider utils={MomentUtils} moment={moment}>
            <WorkSessionProvider>
              <WorkTimer />
            </WorkSessionProvider>
          </MuiPickersUtilsProvider>
        </MuiThemeProvider>
      </Provider>
    );
  }
}
