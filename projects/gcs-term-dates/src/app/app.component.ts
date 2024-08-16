import { Component, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog } from '@angular/material/dialog';

import { GcsTermDatesDataService } from 'services/gcs-term-dates-data.service';
import { GcsDataService } from 'services/gcs-data.service';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { GcsCodelistsDataService } from 'services/gcs-codelists-data.service';
import { GcsStandardAddUpdRecDlgComponent } from 'projects/gcs-shared-lib/src/lib/gcs-standard-add-upd-rec-dlg/gcs-standard-add-upd-rec-dlg.component';
import { fldDef } from 'services/gcs-table-field-defs-cache.service';

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
    // build dynamic dropdown lists defined in flddefs
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.codelistsdatasvc.loadDependentCodeLists(this.tbldatasvc.flddefs()).subscribe({
      // success
      next: () => {
        this.getFullList();// load list
      },

      // error
      error: (error: any) => {
        console.error('Error:', error);
      },

      // complete
      complete: () => {
        bnr.close();
      }
    });
  }

  // refresh ui list
  getFullList() {
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.tbldatasvc.getlist()?.subscribe({
      // success
      next: list => {
        // because we want to sort by more than one column, we have to do it here
        list.sort((t1, t2) => {
          if (t1.termyear > t2.termyear) { return -1; }
          if (t1.termyear < t2.termyear) { return 1; }
          if (t1.termcode > t2.termcode) { return -1; }
          if (t1.termcode < t2.termcode) { return 1; }
          return 0;
        });
        this.dblist = list;

        // since the data is returned async, also init the material datasource in this function.
        this.dataSource = new MatTableDataSource(this.dblist);

        // sort & filter on the expanded description for columns defined with descriptions
        this.gcsdatasvc.setSelSortFilt(this.dataSource, this.tbldatasvc.flddefs(), this.codelistsdatasvc);

        this.dataSource.sort = this.sort;

        this.applyListFilter(this.listFilterVal);
      },

      // error
      error: (error) => {
        console.error('Error:', error);
      },

      // complete
      complete: () => {
        bnr.close();
      }
    });
  }

  applyListFilter(val: string) {
    this.listFilterVal = val;
    this.dataSource.filter = val.trim().toLowerCase();
  }

  // click row, pop up edit dialog
  onRowClick(rec: any, clickedcol: fldDef) {
    if (clickedcol.datatype !== 'buttons') {
      this.origRec = rec;// copy reference to rec in model list so we can refresh it upon save
      this.openDialog(rec);
    }
  }

  // click +, pop up add dialog
  onAddClick() {
    this.addmode = true;
    this.origRec = this.tbldatasvc.initRec();// "original" rec is a new empty rec
    this.openDialog(this.origRec);// new empty rec for dialog
  }

  // click del, pop up delete confirm
  onDelClick(rec: any) {
    if (confirm('Are you sure you want to delete ' + rec.termname + '?')) {
      // when Delete pressed, delete record
      const bnr = this.gcsdatasvc.showNotification('Saving...', '');
      this.tbldatasvc?.delrec(rec)?.subscribe({
        // success
        next: () => {
          this.getFullList();
        },

        // error
        error: (error) => {
          console.error('Error:', error);
        },

        // complete
        complete: () => {
          bnr.close();
        }
      });
    }
  }

  // open the Add/Update dialog
  openDialog(rec: any) {
    let cfg = this.codelistsdatasvc.getDlgCfg(this.tbldatasvc.tableid);// get the dialog properties for this table
    let dialogRef = this.dialog.open(GcsStandardAddUpdRecDlgComponent, {
      autoFocus: true,
      width: cfg.dlg.width,
      height: cfg.dlg.height,
      data: {
        title: cfg.dlg.title,
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
        this.addmode = false;
      } else {
        this.tbldatasvc.copyRec(result.rec, this.origRec);// for update, refresh the ui list
      }
    });
  }
}
