import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';
import { GcsCodelistsCacheService } from './gcs-codelists-cache.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GcsCoursesDataService {
//  // OLD SCHEME (used only to populate the new field def table)
//  coldefstr = `
//id int   //Identity Key|nolist|show=hide
//coursecode string   //Course Code|val(required)|upd(show=readonly)|width=120px
//shorttitle string   //Short Title|val(required)|width=320px
//title string   //Long Title|val(required)|nolist|width=520px|newline
//description string   //Description|nolist|width=520px|text
//coursehours int   //Course Hours|val(required)|nolist|width=120px|newline
//lectures int   //Lectures|val(required)|nolist|width=100px
//defaultinstructor int   //Dft Instructor|sel(tbl,instructor)|width=300px
//requiredtextbooks string   //Required Textbooks|nolist|width=520px|text|newline
//comments string   //Comments|nolist|width=520px|text|newline
//`;

  tableid = 'course';// define our table id
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
    public codelistscachesvc: GcsCodelistsCacheService,
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
      error: (error: string) => {
        this.gcsdatasvc.showNotification(error, '');
      },
    });
  }

  /*
  +----------------------
  | moodle service calls
  +----------------------*/

  // get entire list
  getlist() {
    return this.gcsdatasvc.getlist('courses_get', {}, this.flddefs());
  }

  // get a req object to be used later to get the list
  buildcodelistreq(i: number, x: any) {
    return this.gcsdatasvc.fmtgcsreq(i, 'courses_get', {});
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('course_get', { id }, this.flddefs());
  }

  // read specific record from server
  getrecbycode(coursecode: string) {
    return this.gcsdatasvc.getrec('course_get_by_coursecode', { coursecode }, this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('course_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('course_insert', rec, this.flddefs());
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('course_delete', rec);
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: this.tableid, keycsv: rec.coursecode }, this.flddefs());
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
  initRec() {
    return this.gcsdatasvc.initRec(this.flddefs());
  }

  valRec(rec: any, flddefs: fldDef[]) {
    rec.coursecode = rec.coursecode.toUpperCase();// Force code to uppercase

    return new Observable<string>((observer) => {
      // For standard errors or updates, just pass back the validation results (note that we want to use the flddefs from the dialog, not the service's flddefs)
      let errmsg = this.gcsdatasvc.stdValRec(flddefs, this.codelistscachesvc, rec);
      if (errmsg) {
        observer.next(errmsg);
        observer.complete();
        return;
      }

      // Read for possible duplicate record
      const bnr = this.gcsdatasvc.showNotification('checking for duplicate...', 'save');
      this.getrecbycode(rec.coursecode).subscribe({
        // returns a list of one record if it exists
        next: (dbrec) => {// either returns the record or a boolean false object
          // record found on db:  for adds or if a key field has changed, indicate it's a duplicate
          if (dbrec && dbrec.id != rec.id) {// note that the dbrec.id is a string whereas the rec.id is a number type so the compare cannot be ===
            errmsg = '"' + this.codelistscachesvc.getSelVal('tbl_course', dbrec.coursecode) + '" is already defined.';
          }
          observer.next(errmsg);
        },
        error: (error) => {
          bnr.close();
          observer.next(error);
          observer.complete();
          return;
        },
        complete: () => {
          bnr.close();
          observer.complete();
          return;
        }
      });
    });
  }

  flddefsForDialogMode(isAdd: boolean) {
    return this.flddefdatasvc.getFldDefsForDialogMode(isAdd, this.flddefs());
  }

  buildKey(rec: any) {
    return rec.coursecode;
  }

  buildDesc(rec: any) {
    return rec.coursecode + ' - ' + rec.shorttitle;
  }
}
