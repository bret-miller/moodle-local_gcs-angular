import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsCodelistsDataService } from './gcs-codelists-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';

@Injectable({
  providedIn: 'root'
})
export class GcsSchAvailableDataService {
//  // OLD SCHEME (used only to populate the new field def table)
//  coldefstr = `
//id int   //Identity Key|nolist|show=hide
//scholarshipcode string   //Code|val(required)|upd(show=readonly)|width=100px
//description string   //Description|val(required)|text|width=500px
//scholarshiptext string   //Scholarship Text|val(required)|nolist|html|width=850px
//statusconfirm string   //Status Confirmation Text|val(required)|nolist|html|width=850px
//perunitamount double   //Per unit amount|val(required)|nolist
//coursemax int   //Maximum courses|val(required)|nolist
//eligibleyears int   //Eligible years|val(required)|nolist
//applyfrom int   //Apply from|date|val(required)
//applythru int   //Apply thru|date|nolist|val(required)
//`;

  tableid = 'schavailable';// define our table id
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
    public codelistsdatasvc: GcsCodelistsDataService,
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
    return this.gcsdatasvc.getlist('sch_available_get_all', {}, this.flddefs());
  }

  // get a req object to be used later to get the list
  buildcodelistreq(i: number) {
    return this.gcsdatasvc.fmtgcsreq(i, 'sch_available_get_all', {});
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('sch_available_get', { id }, this.flddefs());
  }

  // read specific record from server
  getrecbycode(scholarshipcode: string) {
    return this.gcsdatasvc.getrec('sch_available_get_by_code', { scholarshipcode } , this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    // TEMPORARY: replace the markdown with html
    rec.scholarshiptext = rec.scholarshiptext.replace(/\[\^/g, '<').replace(/\^\]/g, '>');
    rec.statusconfirm = rec.statusconfirm.replace(/\[\^/g, '<').replace(/\^\]/g, '>');
    // END TEMPORARY
    return this.gcsdatasvc.updrec('sch_available_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('sch_available_insert', rec, this.flddefs());
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('sch_available_delete', rec);
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: 'scholarship', keycsv: rec.scholarshipcode }, this.flddefs());
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

  buildKey(rec: any) {
    return rec.scholarshipcode;
  }

  buildDesc(rec: any) {
    return rec.description;
  }
}
