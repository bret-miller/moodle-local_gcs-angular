import { Component, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog } from '@angular/material/dialog';

import { GcsSchGivenDataService } from 'services/gcs-sch-given-data.service';
import { GcsDataService, columnSchema } from 'services/gcs-data.service';
import { Observable, map, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';
import { GcsCodelistsDataService } from 'services/gcs-codelists-data.service';
import { GcsStudentDataService } from 'services/gcs-student-data.service';
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
    show: true,
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

  // mat properties
  dataSource: MatTableDataSource<any> = new MatTableDataSource(this.dblist);
  @ViewChild(MatSort) sort!: MatSort;// sort control

  constructor(
    private gcsdatasvc: GcsDataService,
    private dialog: MatDialog,
    public tbldatasvc: GcsSchGivenDataService,
    public studatasvc: GcsStudentDataService,
    public codelistsdatasvc: GcsCodelistsDataService,
  ) {
  }

  // initialization
  ngAfterViewInit() {
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    // explicitly queue scholarship_category codelist
    this.codelistsdatasvc.queueCodeListRef('codeset_scholarship_category');// queue the scholarship_category codelist get request

    // get queued lists plus select lists defined in coldefs
    this.codelistsdatasvc.loadCodeLists(this.tbldatasvc.coldefs).subscribe(() => {
      // add (all) option at the top of the list
      this.listSel.fullList.push({ code: '', description: '(all)' });

      this.studatasvc.getlistscholarships().subscribe(
        // success
        stulist => {
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
        });
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
    // get a list of all records if (all) is selected, otherwise get list for the selected student
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.tbldatasvc.getlist(this.listSel.selected)?.subscribe(
      // success
      list => {
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

        // for complete list, sort by student name
        if (!this.listSel.selected) {
          this.sort.sort({ id: 'studentid', start: 'asc', disableClear: false });
        } else {
          this.sort.sort({ id: 'termyear', start: 'asc', disableClear: false });
        }
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
        this.applyListFilter(this.listFilterVal);// reapply filter if anything already in the search box
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
          alert('This student is marked "' + this.codelistsdatasvc.getSelVal('codeset_scholarship_category', 'RST') + '" and not eligible for a scholarship.');
          return;
        }

        this.origRec = this.tbldatasvc.initRec();// "original" rec is a new empty rec
        this.origRec.studentid = sturec.id;
        this.origRec.termyear = new Date().getFullYear();
        this.origRec.category = sturec.scholarshipeligible;// init to the student's scholarship eligibility
        this.origRec.requestdate = new Date();
        this.openDialog(this.origRec);// new empty rec for dialog
      }
    });
  }

  // click del, pop up delete confirm
  onDelClick(rec: any) {
    const bnr = this.gcsdatasvc.showNotification('Checking for dependencies...', '');

    this.tbldatasvc.getdependencies(rec).subscribe(
      // success
      (dependencies) => {
        if (dependencies.length > 0) {
          this.gcsdatasvc.showNotification('This record cannot be deleted because it is used in another table.', '', 5000);
        } else if (confirm('Are you sure you want to delete ' + rec.termyear + '?')) {
          const bnr2 = this.gcsdatasvc.showNotification('Deleting...', '');
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
              bnr2.close();
            }
          );
        }
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

  // open the Add/Update dialog
  openDialog(rec: any) {
    let dialogRef = this.dialog.open(GcsStandardAddUpdRecDlgComponent, {
      autoFocus: true,
      width: '950px',
      height: '670px',
      data: {
        title: 'Scholarships',// dialog title
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
