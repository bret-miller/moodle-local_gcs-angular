import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsCodelistsDataService } from './gcs-codelists-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';

@Injectable({
  providedIn: 'root'
})
export class GcsClassesDataService {
//  // OLD SCHEME (used only to populate the new field def table)
//  coldefstr = `
//id int   //Identity Key|nolist|show=hide
//termyear int //Term Year|val(required)|upd(show=readonly)|width=100px
//termcode string //Term|val(required)|upd(show=readonly)|width=120px|sel(codeset,term)
//coursecode string   //Course Code|val(required)|upd(show=readonly)|sel(tbl,course)|width=300px
//shorttitle string   //Short Title|val(required)|width=320px|newline
//title string   //Long Title|val(required)|nolist|width=520px
//description string   //Description|nolist|width=520px|text
//coursehours int   //Course Hours|val(required)|nolist|width=120px|newline
//lectures int   //Lectures|val(required)|nolist|width=100px
//instructor int   //Instructor|sel(tbl,instructor)|width=300px
//requiredtextbooks string   //Required Textbooks|nolist|width=520px|text|newline
//comments string   //Comments|nolist|width=520px|text|newline
//`;

  tableid = 'class';// define our table id
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
    public codelistsdatasvc: GcsCodelistsDataService
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
  getlist() {
    return this.gcsdatasvc.getlist('classes_get', {}, this.flddefs());
  }

  // read specific record from server
  getrec(id: string) {
    return this.gcsdatasvc.getrec('class_get', { id }, this.flddefs());
  }

  // read specific record from server
  getrecbycoursecodeterm(coursecode: string, termyear: string, termcode: string) {
    return this.gcsdatasvc.getrec('class_get_by_code_and_term', { coursecode, termyear, termcode }, this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('class_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('class_insert', rec, this.flddefs());
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('class_delete', rec);
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: 'class', keycsv: rec.termyear + ',' + rec.termcode + ',' + rec.coursecode }, this.flddefs());
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
    let a = this.gcsdatasvc.initRec(this.flddefs());
    a.termyear = new Date().getFullYear();
    return a;
  }

  onValChanged(rec: any, colkey: string) {
    // init record from the course record for empty fields
    if (colkey === 'coursecode') {
      // let them know we're filling in some fields
      let bnr = this.gcsdatasvc.showNotification('Filling in some fields from the course record.', '');

      // subscribe to the course record
      this.codelistsdatasvc.crsdatasvc.getrecbycode(rec.coursecode).subscribe((crsrec: any) => {
        bnr.close();
        if (crsrec) {
          // fill in the fields
          if (!rec.shorttitle) rec.shorttitle = crsrec.shorttitle;
          if (!rec.title) rec.title = crsrec.title;
          if (!rec.description) rec.description = crsrec.description;
          if (!rec.coursehours) rec.coursehours = crsrec.coursehours;
          if (!rec.lectures) rec.lectures = crsrec.lectures;
          if (!rec.instructor) rec.instructor = parseInt(crsrec.defaultinstructor);
          if (!rec.requiredtextbooks) rec.requiredtextbooks = crsrec.requiredtextbooks;

          this.valRec(rec, this.flddefs());
        }
      });
    }
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

  // Allow caller to add columns to flddefs (non-field columns like a buttons column--It does NOT add it to the flds object).
  //addColDef(flddef: fldDef) {
  //  this.flddefs.push(flddef);
  //  this.displayedColumns = this.gcsdatasvc.getDisplayedCols(this.coldefs);
  //}

  buildKey(rec: any) {
    return rec.termyear + '-' + this.codelistsdatasvc.getSelVal('codeset_term', rec.termcode) + '-' + rec.coursecode;
  }

  buildDesc(rec: any) {
    return rec.coursecode + ' - ' + rec.shorttitle;
  }
}
