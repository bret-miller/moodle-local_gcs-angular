import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsCodelistsDataService } from './gcs-codelists-data.service';
import { GcsTableFieldDefsCacheService, fldDef, fldDefSets } from './gcs-table-field-defs-cache.service';

@Injectable({
  providedIn: 'root'
})
export class GcsTableFieldDefService {
  //  // OLD SCHEME (used only to populate the new field def table)
  //  coldefstr = `
  //id int   //Identity Key|show=hide
  //tableid string   //Table Id|val(required)|upd(show=readonly)|add(show=readonly)|width=350px
  //fieldname string   //Field name|val(required)|upd(show=readonly)|add(show=readonly)|width=350px
  //dbdatatype string   //Moodle Data type|val(required)|sel(codeset,dbdatatype)|width=250px
  //datatype string   //Data type|val(required)|sel(codeset,datatype)|width=250px
  //colhdr string   //Column Header|val(required)
  //widthval string   //Pixel width|nolist|val(required)
  //ishtml int   //HTML encode?|nolist|val(required)|bool
  //tooltip string   //Tooltip|nolist|val(required)
  //islist int   //Show in list?|nolist|val(required)|bool
  //issort int   //Sort in list?|nolist|val(required)|bool
  //addshow string   //Add - show/hide/readonly|nolist|val(required)
  //addisnewline int   //Add - dialog field break to newline?|nolist|val(required)|bool
  //addpopupid string   //Add - Popup id|nolist|sel(codeset,popupid)
  //addsellistid string   //Add - Column Header|nolist|val(required)
  //addisrequired int   //Add - required?|val(required)|bool
  //updshow string   //Upd - show/hide/readonly|nolist|val(required)
  //updisnewline int   //Upd - dialog field break to newline?|nolist|val(required)|bool
  //updpopupid string   //Upd - Popup id|nolist|sel(codeset,popupid)
  //updsellistid string   //Upd - Column Header|nolist|val(required)
  //updisrequired int   //Upd - required?|val(required)|bool
  //`;

  tableid = 'flddef';
  private addtlcols: fldDef[] = [];// additional columns
  displayedColumns: string[] = [];// generated from flddefs

  /*
  +------------------------
  | Initialize the service
  +------------------------*/
  constructor(
    private gcsdatasvc: GcsDataService,
    private flddefscachedatasvc: GcsTableFieldDefsCacheService,
    public codelistsdatasvc: GcsCodelistsDataService,
  ) {
    // assure the master field definitions array has been initialized
    this.flddefscachedatasvc.flddefsets$.subscribe({
      // success
      next: (flddefsets) => {
        //if (!this.flddefscachedatasvc.flddefsets) {
        //  // GG APPARENTLY NOT NEEDED BUT I DON'T UNDERSTAND HOW THE DB ASYNC OPERATION IN flddefscachedatasvc INSTANTIATION CAN FINISH BEFORE THIS
        //  this.flddefscachedatasvc.flddefsets = flddefsets;// save for more direct access
        //  alert('externally load cache set.')
        //}
        //this.addDftToDb(this.coldefstr, this.tableid);// ONE-TIME--if our tableid is not present, this means the db has not had its table field defs added, add them now

        // add a buttons column to the end of list columns
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

  //public addDftToDb(coldefstr: string, tableid: string) {
  //  let flddefs = this.flddefscachedatasvc.flddefsets[tableid];// point to specific table field defs array

  //  // if no field defs, add them to the db
  //  if (!flddefs || flddefs.length === 0) {
  //    flddefs = this.flddefscachedatasvc.parseDftList(coldefstr, tableid);

  //    // now add them to the existing array in flddefsets$
  //    this.flddefscachedatasvc.flddefsets[tableid] = flddefs;

  //    // add to db (must be done after the above is set because addrec uses this.flddefsets$)
  //    flddefs.forEach(flddef => {
  //      this.addrec(flddef)?.subscribe();
  //    });
  //  }
  //}

  /*
  +----------------------
  | moodle service calls
  +----------------------*/

  // get list for a table
  getlist() {
    return this.gcsdatasvc.getlist('table_field_def_get_by_tableid', { tableid: '' }, this.flddefs());
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('table_field_def_get', { id }, this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('table_field_def_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('table_field_def_insert', rec, this.flddefs());
  }

  // update specific record
  queueupdrec(rec: any, queue: any[]) {
    return this.gcsdatasvc.queueupdrec('table_field_def_update', rec, this.flddefs(), queue);
  }

  // add new record
  queueaddrec(rec: any, queue: any[]) {
    return this.gcsdatasvc.queueaddrec('table_field_def_insert', rec, this.flddefs(), queue);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('table_field_def_delete', rec);
  }

  /*
  +----------------------
  | Other public methods
  +----------------------*/
  // access our table set of field defs
  flddefs(): fldDef[] {
    return this.flddefscachedatasvc.getFldDefs(this.tableid);
  }

  // combined our table field definitions plus additional columns
  coldefs(): any {
    return [...this.flddefs(), this.addtlcols];
  }

  // fill method
  copyRec(fromrec: any, torec: any) {
    return this.gcsdatasvc.copyRec(this.flddefscachedatasvc.getFldDefs(this.tableid), fromrec, torec);
  }

  // generate a new flds object
  initRec() {
    return this.gcsdatasvc.initRec(this.flddefscachedatasvc.getFldDefs(this.tableid));
  }

  valRec(rec: any, flddefs: fldDef[]) {
    // note that we want to use the flddefs from the dialog, not this service's flddefs
    //let isvalid = this.gcsdatasvc.valRec(flddefs, this.codelistsdatasvc, rec);
    //if (isvalid) {
    // custom validation
    //if (rec.termyear < 2000) {
    //  alert('Invalid Term Year');
    //  return false;
    //}
    //return isvalid;
    return true;
  }

  // compare method
  hasChanges(rec: any, origrec: any, flddefs: fldDef[]) {
    return this.gcsdatasvc.hasChanges(flddefs, rec, origrec);
  }

  // called for our flddefs
  flddefsForDialogMode(isAdd: boolean) {
    return this.getFldDefsForDialogMode(isAdd, this.flddefs());
  }

  // called when a standardized add/upd dialog is opened.  It copies the add or upd property set as appropriate to the working set used by the dialog template
  compileFldDefsForDialogMode(isAdd: boolean, flddefs: fldDef[]) {
    // process every field definition
    flddefs.forEach(flddef => {
      // hide buttons
      if (flddef.datatype === 'buttons') {
        flddef.show = 'hide';// always hide buttons
        flddef.isnewline = false;
        flddef.popupid = '';
        flddef.isrequired = false;
        flddef.sellistid = '';
        flddef.haschanges = false;
        flddef.errmsg = '';
      } else {
        // based on the add/upd mode, copy to the working properties
        if (isAdd) {
          flddef.show = flddef.addshow;
          flddef.isnewline = flddef.addisnewline;
          flddef.popupid = flddef.addpopupid;
          flddef.isrequired = flddef.addisrequired;
          flddef.sellistid = flddef.addsellistid;
        } else {
          flddef.show = flddef.updshow;
          flddef.isnewline = flddef.updisnewline;
          flddef.popupid = flddef.updpopupid;
          flddef.isrequired = flddef.updisrequired;
          flddef.sellistid = flddef.updsellistid;
        }
        flddef.haschanges = false;
        flddef.errmsg = '';
      }
    });
    return flddefs;
  }

  // called when a standardized add/upd dialog is opened.  It copies the add or upd property set as appropriate to the working set used by the dialog template
  getFldDefsForDialogMode(isAdd: boolean, flddefs: fldDef[]) {
    let ret: fldDef[] = [];// create a new array to return to the caller.  also note that each field is a copy so the cache set isn't changed indirectly.

    // process each entry
    flddefs.forEach(x => {
      let flddef = Object.assign({}, x);
      // hide buttons
      if (flddef.datatype === 'buttons') {
        flddef.show = 'hide';// always hide buttons
        flddef.isnewline = false;
        flddef.popupid = '';
        flddef.isrequired = false;
        flddef.sellistid = '';
        flddef.haschanges = false;
        flddef.errmsg = '';
      } else {
        // copy to the working properties based on the add/upd mode
        if (isAdd) {
          flddef.show = flddef.addshow;
          flddef.isnewline = flddef.addisnewline;
          flddef.popupid = flddef.addpopupid;
          flddef.isrequired = flddef.addisrequired;
          flddef.sellistid = flddef.addsellistid;
        } else {
          flddef.show = flddef.updshow;
          flddef.isnewline = flddef.updisnewline;
          flddef.popupid = flddef.updpopupid;
          flddef.isrequired = flddef.updisrequired;
          flddef.sellistid = flddef.updsellistid;
        }
        flddef.haschanges = false;
        flddef.errmsg = '';
      }
      ret.push(flddef);// add to the return array
    });
    return ret;
  }
}
