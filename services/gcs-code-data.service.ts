/*
+----------------------------------------------------------------------------------------
| This service defines the record and makes moodle service calls
+----------------------------------------------------------------------------------------
*/
import { Injectable } from '@angular/core';

import { GcsDataService, columnSchema } from 'services/gcs-data.service';
import { GcsCodelistsDataService } from './gcs-codelists-data.service';

@Injectable({
  providedIn: 'root'
})
export class GcsCodeDataService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //Identity Key|nolist|show=hide
codeset string   //Code Set|val(required)|nolist|upd(show=readonly)|width=200px
code string   //Code|val(required)|upd(show=readonly)|width=100px
description string   //Description|val(required)|width=400px
`); // parse the moodlefields string into the columnSchema array

  displayedColumns: string[] = this.gcsdatasvc.getDisplayedCols(this.coldefs);// generated from coldefs

  /*
  +------------------------
  | Initialize the service
  +------------------------*/
  constructor(
    private gcsdatasvc: GcsDataService,
    public codelistsdatasvc: GcsCodelistsDataService,
  ) {
    // add a buttons column to the end of list columns
    let a = new columnSchema();
    a.key = 'isEdit';
    a.type = 'buttons';
    a.issort = false;
    this.addColDef(a);
  }

  /*
  +----------------------
  | moodle service calls
  +----------------------*/

  // get list for dropdown
  getlist() {
    return this.gcsdatasvc.getlist('codesets_get', {}, this.coldefs);
  }

  // get selected list
  getlistbycodeset(codeset: string) {
    return this.gcsdatasvc.getlist('codes_get', { codeset }, this.coldefs);
  }

  // get selected list
  buildcodelistreq(i: number, parms: {}) {
    return this.gcsdatasvc.fmtgcsreq(i, 'codes_get', parms);
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('code_get', { id }, this.coldefs);
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('code_update', rec, this.coldefs);
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('code_insert', rec, this.coldefs);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('code_delete', rec);
  }

  /*
  +----------------------
  | Other public methods
  +----------------------*/

  // fill method
  copyRec(fromrec: any, torec: any) {
    return this.gcsdatasvc.copyRec(this.coldefs, fromrec, torec);
  }

  // generate a new flds object
  initRec() {
    return this.gcsdatasvc.initRec(this.coldefs);
  }

  valRec(rec: any, coldefs: any[]) {
    // note that we want to use the coldefs from the dialog, not the service's coldefs
    let isvalid = this.gcsdatasvc.valRec(coldefs, this.codelistsdatasvc, rec);
    //if (isvalid) {
    // custom validation
    //if (rec.termyear < 2000) {
    //  alert('Invalid Term Year');
    //  return false;
    //}
    return isvalid;
  }

  coldefsForDialogMode(isAdd: boolean) {
    return this.gcsdatasvc.coldefsForDialogMode(isAdd, this.coldefs);
  }

  // compare method
  hasChanges(rec: any, origrec: any, coldefs: any[]) {
    return this.gcsdatasvc.hasChanges(coldefs, rec, origrec);
  }

  // Allow caller to add columnSchema to coldefs (non-field columns like a buttons column--It does NOT add it to the flds object).
  addColDef(coldef: columnSchema) {
    coldef.isnative = false;// this is not a moodle field
    this.coldefs.push(coldef);
    this.displayedColumns = this.gcsdatasvc.getDisplayedCols(this.coldefs);
  }

  addCodeLists(codelists: any, coldefs: columnSchema[]) {
    // for each column designated with a codeset table, look up and save its code list, plus convert it into a key=value pair dictionary object for dynamic lookups.
    if (codelists) {
      // in codelists, build a codeset: object for each select=codeset_ column.  It contains 2 sub-items:
      // list: the codeset list from moodle
      // lookup: a dictionary object with each code populated with its description as the value.
      coldefs.forEach(col => {
        // each select=codeset_ column (if codeset is not already loaded)
        if (col.type === 'select' && col.sellist.indexOf('codeset_') === 0 && !codelists[col.sellist]) {
          let codeset = col.sellist.substring(8);// get codeset name
          // get list subset from server
          this.getlistbycodeset(codeset).subscribe(list => {
            // populate a code dictionary for quick description lookups
            let a: any = {};
            codelists[col.sellist] = a;// save off code list dictionary

            let codelist: any[] = [];
            a.list = codelist;
            let lookup: any = {};
            a.lookup = lookup;

            // add a blank record to the top of the list when the column is not required
            //if (!col.selreq) {
            //  let r: any = {};
            //  r.code = '';
            //  r.description = '';
            //  codelist.push(r);// add each record to the code list
            //}

            // copy to new list and populate a code dictionary for quick description lookups
            list.forEach(rec => {
              let r: any = {};
              r.code = rec.code;
              r.description = rec.description;
              codelist.push(r);// add each record to the code list

              lookup[rec.code] = rec.description;// add each record to the code list keyed on id
            });
          });
        }
      });
    }
  }
}
