import { Component, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog } from '@angular/material/dialog';

import { GcsProgramReqDataService } from 'services/gcs-program-req-data.service';
import { GcsDataService } from 'services/gcs-data.service';
import { Observable, map, of, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
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
  @ViewChild('listSelCtl') listSelCtl: any;
  listSel = {
    show: true,
    disabled: false,
    fullList: new Array<any>,
    displayList: new Observable<any[]>,// shown in dropdown and dynamically filtered by what is typed in the filter ctl
    selected: '',// default dropdown selection
    filt: {
      show: true,
      ctl: new FormControl(),// filtering dropdown control
      doit: (val: any) => {
        return this.listSel.fullList.filter(item =>
          item.description.toLowerCase().includes(val.toLowerCase())
        );
      }
    },// filter object
    widthpx: '400',// dropdown width
    placeholder: 'Program',// dropdown label
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
    public tbldatasvc: GcsProgramReqDataService,
    public codelistsdatasvc: GcsCodelistsDataService,
    public codelistscachesvc: GcsCodelistsCacheService,
  ) {
  }

  // initialization
  ngAfterViewInit() {
    this.sort.sort({ id: 'reportseq', start: 'asc', disableClear: false });// initialize sort

    // build dynamic dropdown lists defined in flddefs
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.codelistsdatasvc.loadDependentCodeLists(this.tbldatasvc.flddefs()).subscribe({
      // success
      next: () => {
        // populate the dropdown list from the cached student codelist
        this.codelistscachesvc.getSelList('tbl_program').forEach((rec: any) => {
          // build dropdown list
          this.listSel.fullList.push({ code: rec.code, description: rec.description });
        });
        //        this.listSel.widthpx = this.tbldatasvc.coldefs.find(x => x.key === 'programcode')?.widthval?.replace('px', '') || '300';// get width from coldefs

        // set up the incremental search
        this.listSel.displayList = this.listSel.filt.ctl.valueChanges
          .pipe(
            startWith(''),
            map(str => this.listSel.filt.doit(str))
          );
      },

      // error
      error: (error: string) => {
        bnr.close();
        this.gcsdatasvc.showNotification(error, '');
      },

      // complete
      complete: () => {
        bnr.close();
        this.listSelCtl.open();// present an open dropdown
      }
    });
  }

  // refresh ui list
  getFullList() {
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.tbldatasvc.getlistbyprogramcode(this.listSel.selected).subscribe({
      // success
      next: list => {
        this.dblist = list;

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
    this.origRec.programcode = this.listSel.selected;// set the program code to the selected program
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
        } else if (confirm('Are you sure you want to delete "' + this.codelistscachesvc.getSelVal('codeset_category', rec.categorycode) + '"?')) {
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