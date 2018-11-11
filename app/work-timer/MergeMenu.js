import React from 'react';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import Menu from '@material-ui/core/Menu';

export default class MergeMenu extends React.Component {
  state = {
    anchorEl: null
  };

  openMenu = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  closeMenu = () => {
    this.setState({ anchorEl: null });
  };

  mergeWorkPeriods = (id: string, nextId: string) => {
    this.props.mergeWorkPeriods(id, nextId);
    this.closeMenu();
  };

  render() {
    const { workPeriodId, nextWorkPeriodId, prevWorkPeriodId } = this.props;
    const { anchorEl } = this.state;

    return nextWorkPeriodId || prevWorkPeriodId ? (
      <>
        <Button size="small" onClick={this.openMenu}>
          MERGE
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={this.closeMenu}
        >
          {prevWorkPeriodId && (
            <MenuItem
              onClick={() =>
                this.mergeWorkPeriods(prevWorkPeriodId, workPeriodId)
              }
            >
              previous
            </MenuItem>
          )}
          {nextWorkPeriodId && (
            <MenuItem
              onClick={() =>
                this.mergeWorkPeriods(workPeriodId, nextWorkPeriodId)
              }
            >
              next
            </MenuItem>
          )}
        </Menu>
      </>
    ) : (
      <div />
    );
  }
}
