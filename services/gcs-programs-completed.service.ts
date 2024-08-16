import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsCodelistsDataService } from './gcs-codelists-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';

@Injectable({
  providedIn: 'root'
})
export class GcsProgramsCompletedService {
//  // OLD SCHEME (used only to populate the new field def table)
//  coldefstr = `
//id int   //key|nolist|show=hide
//studentid int   //Student|val(required)|nolist|show=readonly|sel(tbl,student)|width=350px
//description string   //Description|val(required)|width=300px
//university string   //University|val(required)|nolist
//enrolldate int   //Enrollment Date|val(required)|date|newline
//completiondate int   //Completed|val(required)|date
//notes string   //Notes|nolist|width=520px|text|newline
//basisofadmission int   //Basis of Admission|bool|nolist|newline
//source string   //Source|val(required)|sel(codeset,pgm_completed_src)|width=150px
//programcode string   //Program|sel(tbl,program)|width=350px|newline
//`;

  tableid = 'programcompleted';// define our table id
  private addtlcols: fldDef[] = [];// additional columns
  displayedColumns: string[] = [];// generated from flddefs

  /*
  +------------------------
  | Initialize the service
  +------------------------*/
  constructor(
    private gcsdatasvc: GcsDataService,
    private flddefscachedatasvc: GcsTableFieldDefsCacheService,
    public flddefdatasvc: GcsTableFieldDefService,
    public codelistsdatasvc: GcsCodelistsDataService,
  ) {
    // assure the master field definitions array has been initialized
    this.flddefscachedatasvc.flddefsets$.subscribe({
      // success
      next: () => {
        //this.flddefdatasvc.addDftToDb(this.coldefstr, this.tableid);// ONE-TIME--if our tableid is not present, this means the db has not had its table field defs added, add them now

        // add a buttons column to the additional columns array
        let a = new fldDef();
        a.fieldname = 'isEdit';
        a.datatype = 'buttons';
        a.islist = true;
        this.addtlcols.push(a);

        this.displayedColumns = this.flddefscachedatasvc.getDisplayedCols(this.coldefs());// generate displayed columns list
      },

      // error
      error: (error) => {
        console.error('Error:', error);
      }
    });
  }

  /*
  +----------------------
  | moodle service calls
  +----------------------*/

  // get entire list
  getlistall() {
    return this.gcsdatasvc.getlist('program_completion_get_all', { }, this.flddefs());
  }

  // get list for a specific student
  getlistbystuid(stuid: string) {
    return this.gcsdatasvc.getlist('program_completion_get_by_student', { stuid }, this.flddefs());
  }

  // get list conditionally based on stuid parm (stuid='' will return all records)
  getlist(stuid: string) {
    if (!stuid) {
      // also change the flddef to show student name in list
      this.flddefs().every(flddef => {
        if (flddef.fieldname === 'studentid') {
          flddef.islist = true;
          flddef.issort = true;
          return false;
        }
        return true;
      });
      this.displayedColumns = this.flddefscachedatasvc.getDisplayedCols(this.coldefs());// generate displayed columns list
      return this.getlistall();
    } else {
      // also change the flddef to not show student name in list
      this.flddefs().every(flddef => {
        if (flddef.fieldname === 'studentid') {
          flddef.islist = false;
          flddef.issort = false;
          return false;
        }
        return true;
      });
      this.displayedColumns = this.flddefscachedatasvc.getDisplayedCols(this.coldefs());// generate displayed columns list
      return this.getlistbystuid(stuid);
    }
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('program_completion_get', { id }, this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('program_completion_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('program_completion_insert', rec, this.flddefs());
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('program_completion_delete', rec);
  }

  /*
  +----------------------
  | Other public methods
  +----------------------*/
  // our table field definitions
  flddefs(): fldDef[] {
    return this.flddefscachedatasvc.getFldDefs(this.tableid);
  }

  // combined table field definitions plus additional columns for display purposes
  coldefs(): any {
    return [...this.flddefs(), ...this.addtlcols];
  }

  // fill method
  copyRec(fromrec: any, torec: any) {
    return this.gcsdatasvc.copyRec(this.flddefs(), fromrec, torec);
  }

  // generate a new flds object
  initRec() {
    return this.gcsdatasvc.initRec(this.flddefs());
  }

  valRec(rec: any, flddefs: fldDef[]) {
    // note that we want to use the flddefs from the dialog, not the service's flddefs
    let isvalid = this.gcsdatasvc.valRec(flddefs, this.codelistsdatasvc, rec);
    //if (isvalid) {
    // custom validation
    //if (rec.termyear < 2000) {
    //  alert('Invalid Term Year');
    //  return false;
    //}
    return isvalid;
  }

  flddefsForDialogMode(isAdd: boolean) {
    return this.flddefdatasvc.getFldDefsForDialogMode(isAdd, this.flddefs());
  }

  // compare method
  hasChanges(rec: any, origrec: any, flddefs: fldDef[]) {
    return this.gcsdatasvc.hasChanges(flddefs, rec, origrec);
  }
}
