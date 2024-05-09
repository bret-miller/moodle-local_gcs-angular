/*
+----------------------------------------------------------------------------------------
| This service defines the record and makes moodle service calls for the table
+----------------------------------------------------------------------------------------
to change the record layout in moodle, modify corresponding "record" file in /home/gcswww/dev.gcs.edu/local/gcs/classes/external/recorddefs/ e.g. student.php
*/
import { Injectable, Pipe, PipeTransform } from '@angular/core';

import { GcsDataService, columnSchema } from 'services/gcs-data.service';
import { GcsCodelistsDataService } from './gcs-codelists-data.service';

@Injectable({
  providedIn: 'root'
})
export class GcsProgramReqDataService {
  // copy/paste the moodle fields string from moodle: Dashboard->Site administration->Server->Web services->API Documentation:  Response, General structure (object contents only)
  // (coldefs is used throughout this app to control how the fields display)
  // (moodle automatically maintains the documentation page based on the php file in /home/gcswww/dev.gcs.edu/local/gcs/classes/external/)
  // (if a change is needed, please change the authoritative php file in moodle)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //Identity Key|nolist|show=hide
programcode string   //Program|val(required)|nolist|upd(show=readonly)|add(show=readonly)|sel(tbl,program)|width=350px
categorycode string   //Category|val(required)|sel(codeset,category)|width=250px
description string   //Description|val(required)|text|width=300px
coursesrequired int   //Required Courses|val(required)
reportseq int   //Report Seq|val(required)
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
  getlistbyprogramcode(programcode:string) {
    return this.gcsdatasvc.getlist('programreqs_get', { programcode }, this.coldefs);
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('programreq_get', { id }, this.coldefs);
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('programreq_update', rec, this.coldefs);
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('programreq_insert', rec, this.coldefs);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('programreq_delete', rec);
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: 'programreq', keycsv: rec.programcode + ',' + rec.categorycode }, this.coldefs);
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
