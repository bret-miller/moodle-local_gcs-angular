/*
Use this component to display the list of classes taken.  It can be used in a dialog popup or full page display.

e.g.
<lib-gcs-classes-taken [student-id]="stuid"></lib-gcs-classes-taken>
or
<lib-gcs-classes-taken></lib-gcs-classes-taken>

Nothing is passed back to the caller.

- When [student-id]="stuid" is specified, the list is filtered for the specified student id, typically used in a dialog popup from the student record.
- When [student-id] is not specified, the complete list is displayed, typically used in a full page display.
*/
import { Component, Input, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog } from '@angular/material/dialog';

import { GcsClassesTakenDataService } from 'services/gcs-classes-taken-data.service';
import { GcsDataService } from 'services/gcs-data.service';
import { Observable, map, of, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
import { GcsCodelistsDataService } from 'services/gcs-codelists-data.service';
import { GcsStandardAddUpdRecDlgComponent } from 'projects/gcs-shared-lib/src/lib/gcs-standard-add-upd-rec-dlg/gcs-standard-add-upd-rec-dlg.component';
import { fldDef } from 'services/gcs-table-field-defs-cache.service';
import { GcsCodelistsCacheService } from 'services/gcs-codelists-cache.service';

@Component({
  selector: 'lib-gcs-classes-taken',
  templateUrl: '../../../../../html/standard-table-list.html',
  styleUrl: './gcs-classes-taken.component.css',
  providers: [
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { hasBackdrop: true } }
  ]
})
export class GcsClassesTakenComponent {
  @Input('student-id') stuid: string = '';// list of class taken records (passed by reference)

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
    widthpx: '350',// dropdown width
    placeholder: 'Student',// dropdown label
  };

  // button column buttons
  btnlist = [
    {
      icon: 'delete',
      color: 'warn',
      click: (rec: any) => this.onDelClick(rec),
      mouseenter: (rec: any) => { },
      tooltip: 'Delete this record!'
    },
  ];

  // mat properties
  dataSource: MatTableDataSource<any> = new MatTableDataSource(this.dblist);
  @ViewChild(MatSort) sort!: MatSort;// sort control

  constructor(
    private gcsdatasvc: GcsDataService,
    private dialog: MatDialog,
    public tbldatasvc: GcsClassesTakenDataService,
    public codelistsdatasvc: GcsCodelistsDataService,
    public codelistscachesvc: GcsCodelistsCacheService,
  ) {
  }

  // initialization
  ngAfterViewInit() {
    // build dynamic dropdown lists defined in flddefs
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.codelistsdatasvc.loadDependentCodeLists(this.tbldatasvc.flddefs(), 'tbl_class').subscribe({
      // success
      next: () => {
        // populate the dropdown list from the cached student codelist
        this.codelistscachesvc.getSelList('tbl_student').forEach((rec: any) => {
          // build dropdown list
          this.listSel.fullList.push({ code: rec.code, description: rec.description });
        });

        // set up the incremental search
        this.listSel.displayList = this.listSel.filt.ctl.valueChanges
          .pipe(
            startWith(''),
            map(str => this.listSel.filt.doit(str))
          );

        if (this.listSel.show) {
          if (this.stuid) {
            this.listSel.disabled = true;// enable the dropdown based on stuid
            this.listSel.selected = this.stuid;// set the default dropdown selection
            this.getFullList();// display the list for the selected student
          } else {
            this.listSel.disabled = false;// enable the dropdown based on stuid
            this.listSelCtl.open();// present an open dropdown
          }
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

  // refresh ui list
  getFullList() {
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.tbldatasvc.getlistbystuid(this.listSel.selected).subscribe({
      // success
      next: list => {
        // because we want to sort by more than one column, we have to do it here
        list.sort((t1, t2) => {
          if (t1.termyear > t2.termyear) { return -1; }
          if (t1.termyear < t2.termyear) { return 1; }
          if (t1.termcode > t2.termcode) { return -1; }
          if (t1.termcode < t2.termcode) { return 1; }
          if (t1.coursecode > t2.coursecode) { return 1; }
          if (t1.coursecode < t2.coursecode) { return -1; }
          return 0;
        });

        // this table has no dependencies but does have some logic to determine if a record can be deleted
        list.forEach(rec => {
          this.SetDelIconSts(rec);
        });
        this.dblist = list;

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
    if (!this.listSel.selected) {
      alert('Please select a student from the dropdown to add a record.');
      return;
    }
    this.addmode = true;
    this.origRec = this.tbldatasvc.initRec();// "original" rec is a new empty rec
    this.origRec.studentid = this.listSel.selected;
    this.origRec.registrationdate = new Date();
    this.openDialog(this.origRec);// new empty rec for dialog
  }

  // click del, pop up delete confirm
  onDelClick(rec: any) {
    if (rec.completiondate || rec.gradecode) {
      this.gcsdatasvc.showNotification('This class shows that it has been completed or given a grade.  To delete it, you must first remove the Grade and Completed date.', '', 5000);
    } else if (confirm('Are you sure you want to delete "' + this.codelistscachesvc.getSelVal('tbl_course', rec.coursecode) + '"?')) {
      // when Delete pressed, delete record
      const bnr = this.gcsdatasvc.showNotification('Deleting...', '');
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
  }

  SetIconsSts(rec: any) {
    this.SetDelIconSts(rec);// check for dependencies on db
  }

  private SetDelIconSts(rec: any) {
    let key = rec.id + 'delete';
    if (this.iconbtns[key] === undefined) {
      let o: any = {};
      o.disabled = (rec.completiondate || rec.gradecode ? true : false);
      o.reccnt = null;
      this.iconbtns[key] = o;// add key to lookup
    }
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