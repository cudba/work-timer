import * as React from 'react';
import Button from '@material-ui/core/Button';
import workSessionsCache from '../cache/work-sessions-cache';
import workSessionSettings from '../cache/work-session-settings';

export default class GlobalSettings extends React.Component {
  render() {
    return (
      <div style={{display: 'flex', padding: 40}}>
        <div style={{margin: '0px auto'}}>
        <Button
          variant="outlined"
          onClick={() => {
            workSessionsCache.flushAll();
            workSessionSettings.flushAll();
          }}
        >
          Clear all data{' '}
        </Button>
        </div>
      </div>
    );
  }
}
