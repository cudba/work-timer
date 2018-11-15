import React from 'react';
import moment from 'moment-timezone';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import TimePicker from 'material-ui-pickers/TimePicker';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import MergeMenu from './MergeMenu';

const styles = theme => ({
  root: {
    width: '100%',
    // maxWidth: 600,
    marginBottom: theme.spacing.unit * 3,
    overflowX: 'auto'
  },
  table: {
    minWidth: 400
    // maxWidth: 600
  }
});

class WorkPeriodsTable extends React.Component {
  render() {
    const {
      classes,
      workPeriods,
      updateWorkPeriod,
      mergeWorkPeriods,
      deleteWorkPeriod
    } = this.props;

    return workPeriods.length ? (
      <div className={classes.root}>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell style={{ width: 70 }}>Start Time </TableCell>
              <TableCell style={{ width: 70 }}>End Time</TableCell>
              <TableCell>Comment</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {workPeriods.map((workPeriod, index) => {
              return (
                <TableRow key={workPeriod.id}>
                  <TableCell
                    style={{ width: 70 }}
                    padding="dense"
                    component="th"
                    scope="row"
                  >
                    <TimePicker
                      variant="outlined"
                      margin="dense"
                      okLabel={<Typography>OK</Typography>}
                      cancelLabel={<Typography>CANCEL</Typography>}
                      value={moment(workPeriod.startTime)}
                      onChange={date =>
                        updateWorkPeriod(workPeriod.id, {
                          startTime: date.toISOString()
                        })
                      }
                      ampm={false}
                    />
                  </TableCell>
                  <TableCell
                    style={{ width: 70 }}
                    padding="dense"
                    component="th"
                    scope="row"
                  >
                    {workPeriod.endTime && (
                      <TimePicker
                        variant="outlined"
                        margin="dense"
                        okLabel={<Typography>OK</Typography>}
                        cancelLabel={<Typography>CANCEL</Typography>}
                        value={moment(workPeriod.endTime)}
                        onChange={date =>
                          updateWorkPeriod(workPeriod.id, {
                            endTime: date.toISOString()
                          })
                        }
                        ampm={false}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <TextField
                      variant="outlined"
                      fullWidth
                      multiline
                      rowsMax="4"
                      value={workPeriod.comment}
                      onChange={event =>
                        updateWorkPeriod(workPeriod.id, {
                          comment: event.target.value
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {workPeriod.endTime && (
                      <>
                        <MergeMenu
                          workPeriodId={workPeriod.id}
                          nextWorkPeriodId={
                            workPeriods[index + 1] && workPeriods[index + 1].id
                          }
                          prevWorkPeriodId={
                            workPeriods[index - 1] && workPeriods[index - 1].id
                          }
                          mergeWorkPeriods={mergeWorkPeriods}
                        />
                        <Button
                          style={{ marginRight: 10 }}
                          size="small"
                          onClick={() => deleteWorkPeriod(workPeriod.id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    ) : (
      <div />
    );
  }
}

export default withStyles(styles)(WorkPeriodsTable);
