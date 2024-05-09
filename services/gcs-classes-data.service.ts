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
export class GcsClassesDataService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //Identity Key|nolist|show=hide
termyear int //Term Year|val(required)|upd(show=readonly)|width=100px
termcode string //Term|val(required)|upd(show=readonly)|width=120px|sel(codeset,term)
coursecode string   //Course Code|val(required)|upd(show=readonly)|sel(tbl,course)|width=300px
shorttitle string   //Short Title|val(required)|width=320px|newline
title string   //Long Title|val(required)|nolist|width=520px
description string   //Description|nolist|width=520px|text
coursehours int   //Course Hours|val(required)|nolist|width=120px|newline
lectures int   //Lectures|val(required)|nolist|width=100px
instructor int   //Instructor|sel(tbl,instructor)|width=300px
requiredtextbooks string   //Required Textbooks|nolist|width=520px|text|newline
comments string   //Comments|nolist|width=520px|text|newline
`); // parse the moodlefields string into the columnsSchema array

  displayedColumns: string[] = this.gcsdatasvc.getDisplayedCols(this.coldefs);// generated from coldefs

  /*
  +------------------------
  | Initialize the service
  +------------------------*/
  constructor(
    private gcsdatasvc: GcsDataService,
    public codelistsdatasvc: GcsCodelistsDataService
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
  getlist() {
    return this.gcsdatasvc.getlist('classes_get', {}, this.coldefs);
  }

  // read specific record from server
  getrec(id: string) {
    return this.gcsdatasvc.getrec('class_get', { id }, this.coldefs);
  }

  // read specific record from server
  getrecbycoursecodeterm(coursecode: string, termyear: string, termcode: string) {
    return this.gcsdatasvc.getrec('class_get_by_code_and_term', { coursecode, termyear, termcode }, this.coldefs);
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('class_update', rec, this.coldefs);
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('class_insert', rec, this.coldefs);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('class_delete', rec);
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: 'class', keycsv: rec.termyear + ',' + rec.termcode + ',' + rec.coursecode }, this.coldefs);
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

          this.valRec(rec, this.coldefs);
        }
      });
    }
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

  buildKey(rec: any) {
    return rec.termyear + '-' + this.codelistsdatasvc.getSelVal('codeset_term', rec.termcode) + '-' + rec.coursecode;
  }

  buildDesc(rec: any) {
    return rec.coursecode + ' - ' + rec.shorttitle;
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
