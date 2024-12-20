import { Component, ViewChild } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, map, of, startWith } from 'rxjs';
import { FormControl } from '@angular/forms';

import { GcsCodeDataService } from 'services/gcs-code-data.service';
import { GcsDataService } from 'services/gcs-data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  dblist: any[] = [];// code set for selected codeset
  iconbtns: any = {};// icon buttons statuses lookup (key is rec.id + icon name).  Set asynchronously as mouse touches a row.
  origRec!: any;// saves values in an edited rec
  disablebuttons: boolean = false;// disables the + button
  reloadandsel: string = '';// upon save, reload codesets and select this one

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
    widthpx: '300',// dropdown width
    placeholder: 'Code Set',// dropdown label
  };
          
  // mat properties
  dataSource: MatTableDataSource<any> = new MatTableDataSource(this.dblist);
  @ViewChild(MatSort) sort!: MatSort;// sort control

  constructor(
    private gcsdatasvc: GcsDataService,
    public tbldatasvc: GcsCodeDataService,
    private _liveAnnouncer: LiveAnnouncer
  ) {
    this.origRec = {};
  }

  // initialization
  ngAfterViewInit() {
    this.sort.sort({ id: 'code', start: 'asc', disableClear: false });// initialize sort
    this.loadCodesetSel();// load list
  }

  // refresh dropdown
  private loadCodesetSel() {
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.tbldatasvc.getlist().subscribe({
      // success
      next: list => {
        this.listSel.fullList = [];// clear list
        // populate the dropdown list from the cached student codelist
        list.forEach(rec => {
          this.listSel.fullList.push({ code: rec.codeset, description: rec.codeset });
        });

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

  // refresh code list for selected codeset
  private getCodeList() {
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.tbldatasvc.getlistbycodeset(this.listSel.selected).subscribe({
      // success
      next: list => {
        this.dblist = [];// clear list

        // populate the dropdown list
        list.forEach(rec => {
          // for the special 'codesets' table, filter on 'tbl_' items, the rest are already included
          if (rec.codeset !== 'codesets' || rec.code.indexOf('tbl_') === 0) {
            rec.hasdeps = false;
            // no need to check for dependencies when record is blank
            if (rec.code || rec.description) {
              //// set disabled flags on first few recs
              //this.dblist.every((rec, i) => {
              //  this.SetIconsSts(rec);
              //  return (i < 15); // check the first few for disable status.  They will be checked on a per-record basis anyway.
              //});
            }
            this.dblist.push(rec);// add to list
          }
        });
        this.disablebuttons = false;

        // when last one is deleted, reload codesets (this must be done here instead of in the onDelClick func because list is loaded async)
        if (list.length === 0) {
          this.listSel.selected = '';// clear selection
          this.loadCodesetSel();// reload codes
        }

        // since the data is returned async, also init the material datasource in this function.
        this.refreshList();
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

  private refreshList() {
    this.dataSource = new MatTableDataSource(this.dblist);
    this.dataSource.sort = this.sort;
    //  this.dataSource.filterPredicate = (data, filter) => {
    //    return (data.rec.description.toLowerCase().includes(filter.toLowerCase()) || data.rec.code.toLowerCase().includes(filter.toLowerCase()));
    //  };
  }

  applyListFilter(val: string) {
    this.dataSource.filter = val.trim().toLowerCase();
  }

  showCodeSet() {
    this.getCodeList();// load codes
  }

  // click +, new blank record
  onAddClick() {
    let codeset: any = '';
    if (this.listSel.selected) {
      // existing codeset
      codeset = this.listSel.selected;
    } else {
      // new codeset
      if (confirm('Would you like to create a new code set?')) {
        codeset = prompt('Please enter the new codeset name', '');
        this.reloadandsel = codeset;// upon save, reload codesets and select this one
      }
    }

    // add new record to the list
    if (codeset) {
      this.disablebuttons = true;
      this.origRec = this.tbldatasvc.initRec();// create a new empty rec
      this.origRec.codeset = codeset;
      const addrec = this.tbldatasvc.copyRec(this.origRec, {});// 
      addrec.isEdit = true;
      addrec.isAdd = true; // new empty rec for dialog
      this.dblist.push(addrec);// add to list
      this.refreshList();
    }
  }

  // edit row
  onEditClick(row: any) {
    // reset the isedit and isadd flags in the list
    this.dblist.forEach(rec => {
      rec.isEdit = false;
      rec.isAdd = false;
    });

    // copy reference to rec in model list so we can refresh it upon save
    this.tbldatasvc.copyRec(row, this.origRec);// save orig values
    row.isEdit = true;
    this.disablebuttons = false;
  }

  // cancel, restore record
  onCancelClick(row: any) {
    if (row.isAdd) {
      this.getCodeList();// reload codes
    } else {
      this.tbldatasvc.copyRec(this.origRec, row);// restore values
      row.isEdit = false;
      row.isAdd = false;
    }
    this.disablebuttons = false;
  }

  onSaveClick(rec: any) {
    // (rec will be any upon Save, null for Cancel/ESC)
    if (rec && this.hasChanges(rec)) {
      // complete validation
      this.valRec(rec).subscribe({
        next: (errmsg: string) => {
          if (errmsg) {
            this.gcsdatasvc.showNotification(errmsg, '', 4000);
            return;
          }

          const bnr = this.gcsdatasvc.showNotification('Saving...', 'Save');
          if (rec.id > 0) {
            // drop off unwanted fields, then update record
            this.tbldatasvc.updrec(this.tbldatasvc.copyRec(rec, {}))?.subscribe({
              // success
              next: () => {
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
          } else {
            // add rec
            rec.code = rec.code;// Upper case code
            this.tbldatasvc.addrec(this.tbldatasvc.copyRec(rec, {}))?.subscribe({
              // success
              next: () => {
                if (this.reloadandsel) {
                  this.loadCodesetSel();// reload codesets
                  this.listSel.selected = this.reloadandsel;// select codeset in dropdown
                  this.reloadandsel = '';// reset
                }
                this.getCodeList();// update list
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
          rec.isEdit = false;
          rec.isAdd = false;
        },

        error: (error: string) => {
          alert(error);
        }
      });
    }
    this.disablebuttons = false;
  }

  // click del, pop up delete confirm
  onDelClick(rec: any) {
    // no need to check for dependencies when record is blank
    if (!rec.code && !rec.description) {
      this.confirmAndDelete(rec);
      return;
    }

    // check for dependencies
    const bnr = this.gcsdatasvc.showNotification('Checking for dependencies...', '');

    this.tbldatasvc.getdependencies(rec).subscribe({
      // success
      next: (dependencies) => {
        if (dependencies.length > 0) {
          //let msg = 'This record is used in the following tables: \n';
          //for (let i = 0; i < dependencies.length; i++) {
          //  msg += dependencies[i].tablename + '\n';
          //}
          //msg += 'You must remove these dependencies before you can delete this record.';
          this.gcsdatasvc.showNotification('This record cannot be deleted because it is used in another table.', '', 5000);
        } else {
          this.confirmAndDelete(rec);
          this.disablebuttons = false;
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

  private confirmAndDelete(rec: any) {
    if (rec && this.tbldatasvc && confirm('Are you sure you want to delete "' + rec.codeset + '.' + rec.code + ' (' + rec.description + ')"?')) {
      rec.isEdit = false;
      rec.isAdd = false;
      const bnr = this.gcsdatasvc.showNotification('Deleting...', '');
      this.tbldatasvc.delrec(rec)?.subscribe({
        // success
        next: () => {
          this.getCodeList();
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
      this.tbldatasvc.getdependencies(rec).subscribe({
        // success
        next: (list) => {
          let o: any = {};
          o.disabled = (list.length > 0);// set disable flag if has dependencies
          o.reccnt = null;
          this.iconbtns[key] = o;// add key to lookup
        },

        // error
        error: (error: string) => {
          this.gcsdatasvc.showNotification(error, '');
        },
      });
    }
  }

  hasChanges(rec: any) {
    return this.tbldatasvc.hasChanges(rec, this.origRec, this.tbldatasvc.flddefs());
  }

  valRec(rec: any) {
    return this.tbldatasvc.valRec(rec, this.tbldatasvc.flddefs());
  }

  /** Announce the change in sort state for assistive technology. */
  announceSortChange(sortState: Sort) {
    // This example uses English messages. If your application supports
    // multiple language, you would internationalize these strings.
    // Furthermore, you can customize the message to add additional
    // details about the values being sorted.
    if (sortState.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
  }
}
