// @flow
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import type { Store } from './reducers/types';
import WorkSessionProvider from './components/WorkSessionProvider';

type Props = {
  store: Store,
  history: {}
};

export default class Root extends Component<Props> {
  render() {
    const { store } = this.props;
    return (
      <Provider store={store}>

        <WorkSessionProvider/>
      </Provider>
    );
  }
}
