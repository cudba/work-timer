// @flow
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import type { Store } from '../reducers/types';
import WorkTimer from '../components/WorkTimer';

type Props = {
  store: Store,
  history: {}
};

export default class Root extends Component<Props> {
  render() {
    const { store } = this.props;
    return (
      <Provider store={store}>
        <WorkTimer/>
      </Provider>
    );
  }
}
