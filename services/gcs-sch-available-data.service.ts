import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';
import { GcsCodelistsCacheService } from './gcs-codelists-cache.service';
import { Observable } from 'rxjs';

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
    public codelistscachesvc: GcsCodelistsCacheService,
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
      error: (error: string) => {
        this.gcsdatasvc.showNotification(error, '');
      },
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
  buildcodelistreq(i: number, x: any) {
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
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: this.tableid, keycsv: rec.scholarshipcode }, this.flddefs());
  }

  // queue request to get list of table record dependencies
  queuegetdependencies(rec: any, queue: any[]) {
    return this.gcsdatasvc.queuegetlist('table_record_dependencies', { tablecode: this.tableid, keycsv: rec.scholarshipcode }, queue);
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
    return new Observable<string>((observer) => {
      // For standard errors or updates, just pass back the validation results (note that we want to use the flddefs from the dialog, not the service's flddefs)
      let errmsg = this.gcsdatasvc.stdValRec(flddefs, this.codelistscachesvc, rec);
      if (errmsg) {
        observer.next(errmsg);
        observer.complete();
        return;
      }

      // For adds, check for duplicate record
      const bnr = this.gcsdatasvc.showNotification('checking for duplicate...', 'save');
      this.getlist().subscribe({
        next: (list) => {
          // look through the list to see if the record already exists
          for (let i = 0, dbrec; dbrec = list[i]; i++) {
            if (dbrec.scholarshipcode.toUpperCase() === rec.scholarshipcode.toUpperCase()) {
              // record found on db:  for adds or if a key field has changed, indicate it's a duplicate
              if (dbrec.id != rec.id) {// note that the dbrec.id is a string type whereas the rec.id is a number type so the compare cannot be ===
                errmsg = 'Code "' + dbrec.scholarshipcode + '" is already defined as ' + this.codelistscachesvc.getSelVal('tbl_scholarship', dbrec.scholarshipcode) + '.';
                break;
              }
            }
          }
          observer.next(errmsg);
        },
        error: (error) => {
          bnr.close();
          observer.next(error);
          observer.complete();
          return;
        },
        complete: () => {
          bnr.close();
          observer.complete();
          return;
        }
      });
    });
  }

  flddefsForDialogMode(isAdd: boolean) {
    return this.flddefdatasvc.getFldDefsForDialogMode(isAdd, this.flddefs());
  }

  buildKey(rec: any) {
    return rec.scholarshipcode;
  }

  buildDesc(rec: any) {
    return rec.scholarshipcode + ' - ' + rec.description;
  }
}
