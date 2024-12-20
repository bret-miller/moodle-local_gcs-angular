import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';
import { GcsCodelistsCacheService } from './gcs-codelists-cache.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GcsTermDatesDataService {
//  // OLD SCHEME (used only to populate the new field def table)
//  coldefstr = `
//id int   //Identity Key|nolist|show=hide
//termyear int   //Term Year|val(required)|upd(show=readonly)|width=100px|newline
//termcode string   //Term Code|val(required)|upd(show=readonly)|sel(codeset,term)|width=150px
//termname string   //Term Name|nolist|readonly|width=250px
//accountingcode string   //Accounting Code|nolist|width=150px|newline|tooltip=(Accounting Reference from RegFox Basic Settings)
//accountingtitle string   //Accounting Title|nolist|width=320px
//registrationstart int   //Registration Starts|val(required)|date|newline
//registrationend int   //Registration Ends|val(required)|nolist|date
//classesstart int   //Classes Start|val(required)|date|newline
//classesend int   //Classes End|val(required)|nolist|date
//`;

  tableid = 'termdates';// define our table id
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
      }
    });
  }

  /*
  +----------------------
  | moodle service calls
  +----------------------*/

  // get entire list
  getlist() {
    return this.gcsdatasvc.getlist('term_dates_get_all', {}, this.flddefs());
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('term_dates_get', { id }, this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('term_dates_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('term_dates_insert', rec, this.flddefs());
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('term_dates_delete', rec);
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: this.tableid, keycsv: rec.termyear + ',' + rec.termcode }, this.flddefs());
  }

  // queue request to get list of table record dependencies
  queuegetdependencies(rec: any, queue: any[]) {
    return this.gcsdatasvc.queuegetlist('table_record_dependencies', { tablecode: this.tableid, keycsv: rec.termyear + ',' + rec.termcode }, queue);
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
    let a = this.gcsdatasvc.initRec(this.flddefs());
    a.termyear = new Date().getFullYear();
    return a;
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
            if (dbrec.termyear === rec.termyear && dbrec.termcode === rec.termcode) {
              // record found on db:  for adds or if a key field has changed, indicate it's a duplicate
              if (dbrec.id != rec.id) {// note that the dbrec.id is a string type whereas the rec.id is a number type so the compare cannot be ===
                errmsg = '"' + this.codelistscachesvc.getSelVal('codeset_term', dbrec.termcode) + '-' + dbrec.termyear + '" is already defined.';
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
}