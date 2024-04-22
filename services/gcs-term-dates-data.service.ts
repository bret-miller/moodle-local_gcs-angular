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
export class GcsTermDatesDataService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //Identity Key|nolist|show=hide
termyear int   //Term Year|val(required)|upd(show=readonly)|width=100px|newline
termcode string   //Term Code|val(required)|upd(show=readonly)|sel(codeset,term)|width=150px
termname string   //Term Name|nolist|readonly|width=250px
accountingcode string   //Accounting Code|nolist|width=150px|newline|tooltip=(Accounting Reference from RegFox Basic Settings)
accountingtitle string   //Accounting Title|nolist|width=320px
registrationstart int   //Registration Starts|val(required)|date|newline
registrationend int   //Registration Ends|val(required)|nolist|date
classesstart int   //Classes Start|val(required)|date|newline
classesend int   //Classes End|val(required)|nolist|date
`); // parse the moodlefields string into the columnsSchema array
//address string   //Address|nolist|width=400px|newline
//city string   //City|nolist|width=300px
//state string   //State|nolist|width=80px
//zip string   //Zip code|nolist|width=150px

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
    return this.gcsdatasvc.getlist('term_dates_get_all', {}, this.coldefs);
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('term_dates_get', { id }, this.coldefs);
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('term_dates_update', rec, this.coldefs);
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('term_dates_insert', rec, this.coldefs);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('term_dates_delete', rec);
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
