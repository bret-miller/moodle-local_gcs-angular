import { Component, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog } from '@angular/material/dialog';

import { GcsTermDatesDataService } from 'services/gcs-term-dates-data.service';
import { GcsDataService, columnSchema } from 'services/gcs-data.service';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { GcsCodelistsDataService } from 'services/gcs-codelists-data.service';
import { GcsStandardAddUpdRecDlgComponent } from 'projects/gcs-shared-lib/src/lib/gcs-standard-add-upd-rec-dlg/gcs-standard-add-upd-rec-dlg.component';

@Component({
  selector: 'app-root',
  templateUrl: '../../../../html/standard-table-list.html',
  styleUrls: ['./app.component.scss'],
  providers: [
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { hasBackdrop: true } }
  ]
})
export class AppComponent {
  dblist: any[] = [];// list of records from moodle
  origRec!: any;// pointer to the selected record in the list so it can be individually refreshed after save
  addmode: boolean = false;// add mode flag
  listFilterVal: string = '';// search list

  // dropdown properties (set listSel.show=false if you don't want a dropdown)
  listSel = {
    show: false,
    fullList: new Array<any>,
    displayList: new Observable<any[]>,// shown in dropdown and dynamically filtered by what is typed in the filter ctl
    selected: '',// default dropdown selection
    filt: {
      show: false,
      ctl: new FormControl(),// filtering dropdown control
      doit: (val: any) => {
        return this.listSel.fullList.filter(item =>
          item.description.toLowerCase().includes(val.toLowerCase())
        );
      }
    },// filter object
    widthpx: '350',// dropdown width
    placeholder: '',// dropdown label
  };

  // mat properties
  dataSource: MatTableDataSource<any> = new MatTableDataSource(this.dblist);
  @ViewChild(MatSort) sort!: MatSort;// sort control

  constructor(
    private gcsdatasvc: GcsDataService,
    private dialog: MatDialog,
    public tbldatasvc: GcsTermDatesDataService,
    public codelistsdatasvc: GcsCodelistsDataService,
  ) {
  }

  // initialization
  ngAfterViewInit() {
    // build dynamic select lists defined in coldefs
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.codelistsdatasvc.loadCodeLists(this.tbldatasvc.coldefs).subscribe(
      // success
      () => {
        this.getFullList();// load list
      },

      // error
      (error) => {
        console.error('Error:', error);
      },

      // complete
      () => {
        bnr.close();
      }
    );
  }

  // refresh ui list
  getFullList() {
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.tbldatasvc.getlist()?.subscribe(
      // success
      list => {
        // because we want to sort by more than one column, we have to do it here
        list.sort((t1, t2) => {
          if (t1.termyear > t2.termyear) { return -1; }
          if (t1.termyear < t2.termyear) { return 1; }
          if (t1.termcode > t2.termcode) { return 1; }
          if (t1.termcode < t2.termcode) { return -1; }
          return 0;
        });
        this.dblist = list;

        // since the data is returned async, also init the material datasource in this function.
        this.dataSource = new MatTableDataSource(this.dblist);

        // sort on the expanded description for columns defined with descriptions
        this.dataSource.sortingDataAccessor = (item, property) => {
          for (let i = 0, col; col = this.tbldatasvc.coldefs[i]; i++) {
            if (col.islist && col.key === property) {
              if (col.type === 'select') {
                return this.codelistsdatasvc.getSelVal(col.sellist, item[property])
              }
              return item[property]
            }
          }
        };
        this.dataSource.sort = this.sort;

        // filter on the expanded description for columns defined with descriptions
        this.dataSource.filterPredicate = (item, filter) => {
          let concat = '';
          for (let i = 0, col; col = this.tbldatasvc.coldefs[i]; i++) {
            if (col.islist) {
              if (col.type === 'select') {
                concat += this.codelistsdatasvc.getSelVal(col.sellist, item[col.key]) + ' ';
              } else {
                concat += item[col.key] + ' ';
              }
            }
          }
          return concat.toLowerCase().includes(filter.toLowerCase())
        };
        this.applyListFilter(this.listFilterVal);
      },

      // error
      (error) => {
        console.error('Error:', error);
      },

      // complete
      () => {
        bnr.close();
      }
    );
  }

  applyListFilter(val: string) {
    this.listFilterVal = val;
    this.dataSource.filter = val.trim().toLowerCase();
  }

  // click row, pop up edit dialog
  onRowClick(rec: any, clickedcol: columnSchema) {
    if (clickedcol.type !== 'buttons') {
      this.origRec = rec;// copy reference to rec in model list so we can refresh it upon save
      this.openDialog(rec);
    }
  }

  // click +, pop up add dialog
  onAddClick() {
    this.origRec = this.tbldatasvc.initRec();// "original" rec is a new empty rec
    this.openDialog(this.origRec);// new empty rec for dialog
  }

  // click del, pop up delete confirm
  onDelClick(rec: any) {
    if (confirm('Are you sure you want to delete ' + rec.termname + '?')) {
      // when Delete pressed, delete record
      const bnr = this.gcsdatasvc.showNotification('Saving...', '');
      this.tbldatasvc?.delrec(rec)?.subscribe(
        // success
        () => {
          this.getFullList();
        },

        // error
        (error) => {
          console.error('Error:', error);
        },

        // complete
        () => {
          bnr.close();
        }
      );
    }
  }

  // open the Add/Update dialog
  openDialog(rec: any) {
    let dialogRef = this.dialog.open(GcsStandardAddUpdRecDlgComponent, {
      autoFocus: true,
      width: '40%',
      height: '60%',
      data: {
        title: 'Term Dates',// dialog title
        rec: rec,// record to edit
        tbldatasvc: this.tbldatasvc// give the dialog a reference to our table data service
      }
    });

    // post-close processing
    dialogRef.afterClosed().subscribe(result => {
      if (result.errmsg) {
        alert(result.errmsg);
      } else if (result.isAdd) {
        this.getFullList();// for an add, refresh list to show new record
      } else {
        this.tbldatasvc.copyRec(result.rec, this.origRec);// for update, refresh the ui list
      }
    });
  }
}
