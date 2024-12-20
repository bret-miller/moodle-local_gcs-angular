import { Component, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog } from '@angular/material/dialog';

import { GcsEnrollAgreementDataService } from 'services/gcs-enroll-agreement-data.service';
import { GcsDataService } from 'services/gcs-data.service';
import { FormControl } from '@angular/forms';
import { Observable, map, of, startWith } from 'rxjs';
import { GcsCodelistsDataService } from 'services/gcs-codelists-data.service';
import { GcsCodelistsCacheService } from 'services/gcs-codelists-cache.service';
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
  iconbtns: any = {};// icon buttons statuses lookup (key is rec.id + icon name).  Set asynchronously as mouse touches a row.
  origRec!: any;// pointer to the selected record in the list so it can be individually refreshed after save
  addmode: boolean = false;// add mode flag
  listFilterVal: string = '';// search list

  // dropdown properties (set listSel.show=false if you don't want a dropdown)
  listSel = {
    show: true,
    disabled: false,
    fullList: [
      { code: 'All', description: 'All' },
      { code: 'Current', description: 'Current' }
    ],
    displayList: new Observable<any[]>,// shown in dropdown and dynamically filtered by what is typed in the filter ctl
    selected: 'Current',// default dropdown selection
    filt: {
      show: true,
      ctl: new FormControl(),// filtering dropdown control
      doit: (val: any) => {
        return this.listSel.fullList.filter(item =>
          item.description.toLowerCase().includes(val.toLowerCase())
        );
      }
    },// filter object
    widthpx: '200',// dropdown width
    placeholder: 'Filter',// dropdown label
  };

  // button column buttons
  btnlist = [
    {
      icon: 'delete',
      color: 'warn',
      click: (rec: any) => this.onDelClick(rec),
      tooltip: 'Delete this record!'
    },
  ];

  // mat properties
  dataSource: MatTableDataSource<any> = new MatTableDataSource(this.dblist);
  @ViewChild(MatSort) sort!: MatSort;// sort control

  constructor(
    private gcsdatasvc: GcsDataService,
    private dialog: MatDialog,
    public tbldatasvc: GcsEnrollAgreementDataService,
    public codelistsdatasvc: GcsCodelistsDataService,
    public codelistscachesvc: GcsCodelistsCacheService,
  ) {
  }

  // initialization
  ngAfterViewInit() {
    // build dynamic dropdown lists defined in flddefs
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.codelistsdatasvc.loadDependentCodeLists(this.tbldatasvc.flddefs()).subscribe({
      // success
      next: () => {
        // set up the incremental search
        this.listSel.displayList = this.listSel.filt.ctl.valueChanges
          .pipe(
            startWith(''),
            map(str => this.listSel.filt.doit(str))
          );

        this.getFullList();// load list
      },

      // error
      error: (error: string) => {
        bnr.close();
        this.gcsdatasvc.showNotification(error, '');
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
    this.tbldatasvc.getlist().subscribe({
      // success
      next: list => {
        // sort by credittype, adddate descending (must be done before filtering because we use break logic on credittype change)
        let f1: string = 'credittype';
        let f2: string = 'adddate';
        list.sort((t1, t2) => {
          if (t1[f1] > t2[f1]) { return 1; }
          if (t1[f1] < t2[f1]) { return -1; }
          if (t1[f2] > t2[f2]) { return -1; }
          if (t1[f2] > t2[f2]) { return 1; }
          return 0;
        });

        // filter list on option dropdown
        if (this.listSel.selected === 'All') {
          this.dblist = list;// no filter
        } else {
          // filter on the first credittype item (effectively the latest since we sorted by code, adddate descending)
          this.dblist = [];
          let credittype: string = '';
          list.forEach(r => {
            // break on the first sort field to show only the latest record for each credittype
            if (r[f1] !== credittype) {
              credittype = r[f1];// break on code change
              this.dblist.push(r);
            }
          });
        }

        //// set disabled flags on first few recs
        //this.dblist.every((rec, i) => {
        //  this.SetIconsSts(rec);
        //  return (i < 15); // check the first few for disable status.  They will be checked on a per-record basis anyway.
        //});

        // since the data is returned async, also init the material datasource in this function.
        this.dataSource = new MatTableDataSource(this.dblist);

        // sort & filter on the expanded description for columns defined with descriptions
        this.gcsdatasvc.setSelSortFilt(this.dataSource, this.tbldatasvc.flddefs(), this.codelistscachesvc);

        this.dataSource.sort = this.sort;

        this.applyListFilter(this.listFilterVal);
      },

      // error
      error: (error: string) => {
        bnr.close();
        this.gcsdatasvc.showNotification(error, '');
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

  SetIconsSts(rec: any) {
    this.SetDelIconSts(rec);// check for dependencies on db
  }

  private SetDelIconSts(rec: any) {
    let key = rec.id + 'delete';
    if (this.iconbtns[key] === undefined) {
      this.tbldatasvc.getdependencies(rec).subscribe({
        // success
        next: (list) => {
          let o: any = {};
          o.disabled = (list.length > 0);// set disable flag if has dependencies
          o.reccnt = list.length;
          this.iconbtns[key] = o;// add key to lookup
        },

        // error
        error: (error: string) => {
          this.gcsdatasvc.showNotification(error, '');
        },
      });
    }
  }

  // click del, pop up delete confirm
  onDelClick(rec: any) {
    let bnr = this.gcsdatasvc.showNotification('Checking for dependencies...', '');
    this.tbldatasvc.getdependencies(rec).subscribe({
      // success
      next: (dependencies) => {
        bnr.close();
        if (dependencies.length > 0) {
          this.gcsdatasvc.showNotification('This record cannot be deleted because it is used in another table.', '', 5000);
        } else if (confirm('Are you sure you want to delete the "' + this.codelistscachesvc.getSelVal('codeset_cr_type', rec.credittype) + '" version added ' + rec.adddate.toLocaleDateString() + '?')) {
          // when Delete pressed, delete record
          bnr = this.gcsdatasvc.showNotification('Deleting...', '');
          this.tbldatasvc.delrec(rec)?.subscribe({
            // success
            next: () => {
              this.getFullList();
            },

            // error
            error: (error: string) => {
              bnr.close();
              this.gcsdatasvc.showNotification(error, '');
            },

            // complete
            complete: () => {
              bnr.close();
            }
          });
        }
      },

      // error
      error: (error: string) => {
        bnr.close();
        this.gcsdatasvc.showNotification(error, '');
      },

      // complete
      complete: () => {
        bnr.close();
      }
    });
  }

  // open the Add/Update dialog
  openDialog(rec: any) {
    let cfg = this.codelistscachesvc.getDlgCfg(this.tbldatasvc.tableid);// get the dialog properties for this table
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
      this.addmode = false;
      if (result.errmsg) {
        alert(result.errmsg);
      } else if (result.isAdd) {
        this.getFullList();// for an add, refresh list to show new record
      } else {
        this.tbldatasvc.copyRec(result.rec, this.origRec);// for update, refresh the ui list record with the record passed back from the dialog
      }
    });
  }
}