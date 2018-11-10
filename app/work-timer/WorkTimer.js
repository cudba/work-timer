// @flow
import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Today from './Today';
import WorkSessions from './WorkSessions';

const styles = theme => ({
  root: {
    height: '100%',
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper
  }
});

const Pages = {
  [0]: Today,
  [1]: WorkSessions
};

type Props = {
  classes: Object
};

type State = {
  value: number,
  Page: any
};

class WorkTimer extends React.Component<Props, State> {
  state = {
    value: 0,
    Page: Pages[0]
  };
  onTabSelect = (event, value) => {
    this.setState({ value, Page: Pages[value] });
  };

  render() {
    const { classes } = this.props;
    const { value, Page } = this.state;
    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Tabs value={value} onChange={this.onTabSelect}>
            <Tab style={{ flex: 1, maxWidth: '100%' }} label="Today" />
            <Tab style={{ flex: 1, maxWidth: '100%' }} label="All Sessions" />
          </Tabs>
        </AppBar>
        <div style={{ height: '100%' }}>
          <Page />
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(WorkTimer);
