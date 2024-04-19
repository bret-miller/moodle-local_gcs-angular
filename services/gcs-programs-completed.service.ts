/*
+----------------------------------------------------------------------------------------
| This service defines the record and makes moodle service calls for the table
+----------------------------------------------------------------------------------------
*/
import { Injectable, Pipe, PipeTransform } from '@angular/core';

import { GcsDataService, columnSchema } from 'services/gcs-data.service';
import { GcsCodelistsDataService } from './gcs-codelists-data.service';

@Injectable({
  providedIn: 'root'
})
export class GcsProgramsCompletedService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //key|nolist|show=hide
studentid int   //Student|val(required)|nolist|show=readonly|sel(tbl,student)|width=350px
description string   //Description|val(required)|width=300px
university string   //University|val(required)|nolist
enrolldate int   //Enrollment Date|val(required)|date|newline
completiondate int   //Completed|val(required)|date
notes string   //Notes|nolist|width=520px|text|newline
basisofadmission int   //Basis of Admission|bool|nolist|newline
source string   //Source|val(required)|sel(codeset,pgm_completed_src)|width=150px
programcode string   //Program|sel(tbl,program)|width=350px|newline
`); // parse the moodlefields string into the columnsSchema array
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

  // get entire list
  getlistall() {
    return this.gcsdatasvc.getlist('program_completion_get_all', { }, this.coldefs);
  }

  // get list for a specific student
  getlistbystuid(stuid: string) {
    return this.gcsdatasvc.getlist('program_completion_get_by_student', { stuid }, this.coldefs);
  }

  // get list conditionally based on stuid parm (stuid='' will return all records)
  getlist(stuid: string) {
    if (!stuid) {
      // also change the coldef to show student name in list
      this.coldefs.every(coldef => {
        if (coldef.key === 'studentid') {
          coldef.islist = true;
          coldef.issort = true;
          return false;
        }
        return true;
      });
      this.displayedColumns = this.gcsdatasvc.getDisplayedCols(this.coldefs);// generated from coldefs
      return this.getlistall();
    } else {
      // also change the coldef to not show student name in list
      this.coldefs.every(coldef => {
        if (coldef.key === 'studentid') {
          coldef.islist = false;
          coldef.issort = false;
          return false;
        }
        return true;
      });
      this.displayedColumns = this.gcsdatasvc.getDisplayedCols(this.coldefs);// generated from coldefs
      return this.getlistbystuid(stuid);
    }
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('program_completion_get', { id }, this.coldefs);
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('program_completion_update', rec, this.coldefs);
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('program_completion_insert', rec, this.coldefs);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('program_completion_delete', rec);
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
    let a = this.gcsdatasvc.initRec(this.coldefs);
    //a.termyear = new Date().getFullYear();
    //a.credittypecode = 'CR';
    return a;
  }

  valRec(rec: any, coldefs: columnSchema[]) {
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
  hasChanges(rec: any, origrec: any, coldefs: columnSchema[]) {
    return this.gcsdatasvc.hasChanges(coldefs, rec, origrec);
  }

  // Allow caller to add columnsSchema to coldefs (non-field columns like a buttons column--It does NOT add it to the flds object).
  addColDef(coldef: columnSchema) {
    this.coldefs.push(coldef);
    this.displayedColumns = this.gcsdatasvc.getDisplayedCols(this.coldefs);
  }
}

/*
+----------------------------------
| Filter out non-listed columns
+----------------------------------*/
@Pipe({
  name: 'colfilter',
  pure: false
})
export class ColListed implements PipeTransform {
  transform(items: any[]): any {
    if (!items) {
      return items;
    }
    // filter items by islist flag
    return items.filter(coldef => coldef.islist);
  }
}
