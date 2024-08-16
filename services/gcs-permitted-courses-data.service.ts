/*
+----------------------------------------------------------------------------------------
| This service defines the record and makes moodle service calls
+----------------------------------------------------------------------------------------
*/
import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsCodelistsDataService } from './gcs-codelists-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';

@Injectable({
  providedIn: 'root'
})
export class GcsPermittedCoursesDataService {
//  // OLD SCHEME (used only to populate the new field def table)
//  coldefstr = `
//id int   //Identity Key|nolist|show=hide
//programcode string   //Program|val(required)|nolist|show=readonly|sel(tbl,program)|width=350px
//categorycode string   //Category|val(required)|sel(codeset,category)|width=250px
//coursecode string   //Course Code|val(required)|sel(tbl,course)|width=350px
//electiveeligible int   //Elective Eligible?|bool
//`;

  tableid = 'permittedcourse';// define our table id
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
  getlistbyprogramcode(programcode: string) {
    return this.gcsdatasvc.getlist('permittedcourses_get', { programcode }, this.flddefs());
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('permittedcourse_get', { id }, this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('permittedcourse_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('permittedcourse_insert', rec, this.flddefs());
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('permittedcourse_delete', rec);
  }

  /*
  +----------------------
  | Other public methods
  +----------------------*/
  // combined table field definitions plus additional columns for display purposes
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
  initRec(code: string) {
    let a = this.gcsdatasvc.initRec(this.flddefs());
    a.programcode = code;
    return a;
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
