/*
Use this component to display the list of scholarships given.  It can be used in a dialog popup or full page display.

e.g.
<lib-gcs-sch-given [student-id]="stuid"></lib-gcs-sch-given>
or
<lib-gcs-sch-given></lib-gcs-sch-given>

Nothing is passed back to the caller.

- When [student-id]="stuid" is specified, the list is filtered for the specified student id, typically used in a dialog popup from the student record.
- When [student-id] is not specified, the complete list is displayed, typically used in a full page display.
*/
import { Component, Input, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog } from '@angular/material/dialog';

import { GcsSchGivenDataService } from 'services/gcs-sch-given-data.service';
import { GcsDataService } from 'services/gcs-data.service';
import { Observable, map, of, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
import { GcsCodelistsDataService } from 'services/gcs-codelists-data.service';
import { GcsCodelistsCacheService } from 'services/gcs-codelists-cache.service';
import { GcsStudentDataService } from 'services/gcs-student-data.service';
import { GcsStandardAddUpdRecDlgComponent } from 'projects/gcs-shared-lib/src/lib/gcs-standard-add-upd-rec-dlg/gcs-standard-add-upd-rec-dlg.component';
import { fldDef } from 'services/gcs-table-field-defs-cache.service';

@Component({
  selector: 'lib-gcs-sch-given',
  templateUrl: '../../../../../html/standard-table-list.html',
  styleUrl: './gcs-sch-given.component.css',
  providers: [
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { hasBackdrop: true } }
  ]
})
export class GcsSchGivenComponent {
  @Input('student-id') stuid: string = '';// list of class taken records (passed by reference)

  dblist: any[] = [];// list of records from moodle
  iconbtns: any = {};// icon buttons statuses lookup (key is rec.id + icon name).  Set asynchronously as mouse touches a row.
  origRec!: any;// pointer to the selected record in the list so it can be individually refreshed after save
  addmode: boolean = false;// add mode flag
  listFilterVal: string = '';// search list

  // dropdown properties (set listSel.show=false if you don't want a dropdown)
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
      tooltip: 'Delete this record!'
    },
  ];

  // mat properties
  dataSource: MatTableDataSource<any> = new MatTableDataSource(this.dblist);
  @ViewChild(MatSort) sort!: MatSort;// sort control

  constructor(
    private gcsdatasvc: GcsDataService,
    private dialog: MatDialog,
    public tbldatasvc: GcsSchGivenDataService,
    public studatasvc: GcsStudentDataService,
    public codelistsdatasvc: GcsCodelistsDataService,
    public codelistscachesvc: GcsCodelistsCacheService,
  ) {
  }

  // initialization
  ngAfterViewInit() {
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');

    // get queued lists plus dropdown lists defined in coldefs
    this.codelistsdatasvc.loadDependentCodeLists(this.tbldatasvc.flddefs(), 'codeset_scholarship_category').subscribe({// alo explicitly queue scholarship_category codelist
      next: () => {
        // add (all) option at the top of the list
        this.listSel.fullList.push({ code: '', description: '(all)' });

        this.studatasvc.getlistscholarships().subscribe({
          // success
          next: stulist => {
            // build the dropdown list
            stulist.forEach(sturec => {
              this.listSel.fullList.push({ code: this.studatasvc.buildKey(sturec), description: this.studatasvc.buildDesc(sturec) });
            });

            // set up the incremental search
            this.listSel.displayList = this.listSel.filt.ctl.valueChanges
              .pipe(
                startWith(''),
                map(str => this.listSel.filt.doit(str))
              );

            this.getFullList();// load list
          }
        });
      },

      // error
      error: (error: string) => {
        bnr.close();
        this.gcsdatasvc.showNotification(error, '');
      },

      // complete
      complete: () => {
        bnr.close();

        if (this.listSel.show) {
          if (this.stuid) {
            this.listSel.disabled = true;// enable the dropdown based on stuid
            this.listSel.selected = this.stuid;// set the default dropdown selection
            this.getFullList();// display the list for the selected student
          } else {
            this.listSel.disabled = false;// enable the dropdown based on stuid
          }
        }
      }
    });
  }

  // refresh ui list
  getFullList() {
    // get a list of all records if (all) is selected, otherwise get list for the selected student
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.tbldatasvc.getlist(this.listSel.selected).subscribe({
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

        // for complete list, sort by student name
        if (!this.listSel.selected) {
          this.sort.sort({ id: 'studentid', start: 'asc', disableClear: false });
        } else {
          this.sort.sort({ id: 'termyear', start: 'desc', disableClear: false });
        }
        this.dataSource.sort = this.sort;

        this.applyListFilter(this.listFilterVal);// reapply filter if anything already in the search box
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
      alert('Please select a student from the dropdown to add a scholarship.');
      return;
    }

    // get the student record
    this.studatasvc.getrecbyid(this.listSel.selected).subscribe(stulist => {
      // allow only single record
      if (stulist.length === 1) {
        let sturec = stulist[0];

        if (sturec.scholarshipeligible === 'RST') {
          alert('This student is marked "' + this.codelistscachesvc.getSelVal('codeset_scholarship_category', 'RST') + '" and not eligible for a scholarship.');
          return;
        }

        this.addmode = true;
        this.origRec = this.tbldatasvc.initRec();// "original" rec is a new empty rec
        this.origRec.studentid = sturec.id;
        this.origRec.termyear = new Date().getFullYear();
        this.origRec.category = sturec.scholarshipeligible;// init to the student's scholarship eligibility
        this.origRec.requestdate = new Date();
        this.openDialog(this.origRec);// new empty rec for dialog
      }
    });
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
        } else if (confirm('Are you sure you want to delete "' + rec.termyear + '"?')) {
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