// @flow
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import type { Store } from './reducers/types';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import WorkTimer from './work-timer/WorkTimer';
import WorkTimeProvider from './work-timer/WorkTimeProvider';

const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#004d40'
    },
    secondary: {
      main: '#00bfa5'
    }
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
          <WorkTimeProvider>
            <WorkTimer />
          </WorkTimeProvider>
        </MuiThemeProvider>
      </Provider>
    );
  }
}
