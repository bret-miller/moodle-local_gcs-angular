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
export class GcsEnrollAgreementDataService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //Identity Key|nolist|show=hide
seqn int   //Old Sequence Number|nolist|show=hide
credittype string   //Type/Code|upd(show=readonly)|sel(codeset,cr_type)|width=200px|val(required)
adddate int   //Add Date|upd(show=readonly)|date|val(required)
agreement string   //Agreement Text|nolist|html|width=900px|newline|val(required)
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
  getlist() {
    return this.gcsdatasvc.getlist('enrollment_agreements_get_all', {}, this.coldefs);
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('enrollment_agreements_get', { id }, this.coldefs);
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('enrollment_agreements_update', rec, this.coldefs);
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('enrollment_agreements_insert', rec, this.coldefs);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('enrollment_agreements_delete', rec);
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: 'enrollmentagreement', keycsv: rec.id }, this.coldefs);
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
    // set default values
    a.adddate = new Date();
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

  buildKey(rec: any) {
    return rec.id;
  }

  buildDesc(rec: any) {
    return rec.credittype;
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
