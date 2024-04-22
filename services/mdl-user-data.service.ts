/*
+----------------------------------------------------------------------------------------
| This service defines the record and makes moodle service calls for the table
+----------------------------------------------------------------------------------------
*/
import { Injectable, Pipe, PipeTransform } from '@angular/core';

import { GcsDataService, columnSchema } from 'services/gcs-data.service';

@Injectable({
  providedIn: 'root'
})
export class MdlUserDataService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //Identity Key|nolist|show=hide
username	string  //Username
idnumber	string  //ID Number
firstname	string  //First Name
middlename	string  //Middle Name
lastname	string  //Last Name
alternatename	string  //Alternate Name
email	string  //Email
suspended int  //Inactive|nolist|bool
`); // parse the moodlefields string into the columnsSchema array

  displayedColumns: string[] = this.gcsdatasvc.getDisplayedCols(this.coldefs);// generated from coldefs

  /*
  +------------------------
  | Initialize the service
  +------------------------*/
  constructor(
    private gcsdatasvc: GcsDataService,
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

  // get list
  getlist() {
    return this.gcsdatasvc.getlist('users_get_all', {}, this.coldefs);
  }

  // get list
  getlistinstructors() {
    return this.gcsdatasvc.getlist('users_get_instructors', {}, this.coldefs);
  }

  // get a req object to be used later to get the list
  buildcodelistreq(i: number, func: string ='users_get_all') {
    return this.gcsdatasvc.fmtgcsreq(i, func, {});
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
    return a;
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
    return (rec.lastname + ', ' + rec.firstname);
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
