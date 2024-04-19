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
export class GcsSchAvailableDataService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //Identity Key|nolist|show=hide
scholarshipcode string   //Code|val(required)|upd(show=readonly)|width=100px
description string   //Description|val(required)|text|width=500px
scholarshiptext string   //Scholarship Text|val(required)|nolist|html|width=850px
statusconfirm string   //Status Confirmation Text|val(required)|nolist|html|width=850px
perunitamount double   //Per unit amount|val(required)|nolist
coursemax int   //Maximum courses|val(required)|nolist
eligibleyears int   //Eligible years|val(required)|nolist
applyfrom int   //Apply from|date|val(required)
applythru int   //Apply thru|date|nolist|val(required)
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
    return this.gcsdatasvc.getlist('sch_available_get_all', {}, this.coldefs);
  }

  // get a req object to be used later to get the list
  buildcodelistreq(i: number) {
    return this.gcsdatasvc.fmtgcsreq(i, 'sch_available_get_all', {});
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('sch_available_get', { id }, this.coldefs);
  }

  // read specific record from server
  getrecbycode(scholarshipcode: string) {
    return this.gcsdatasvc.getrec('sch_available_get_by_code', { scholarshipcode } , this.coldefs);
  }

  // update specific record
  updrec(rec: any) {
    // TEMPORARY: replace the markdown with html
    rec.scholarshiptext = rec.scholarshiptext.replace(/\[\^/g, '<').replace(/\^\]/g, '>');
    rec.statusconfirm = rec.statusconfirm.replace(/\[\^/g, '<').replace(/\^\]/g, '>');
    // END TEMPORARY
    return this.gcsdatasvc.updrec('sch_available_update', rec, this.coldefs);
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('sch_available_insert', rec, this.coldefs);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('sch_available_delete', rec);
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

  buildKey(rec: any) {
    return rec.scholarshipcode;
  }

  buildDesc(rec: any) {
    return rec.description;
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
