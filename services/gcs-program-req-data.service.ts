import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';
import { GcsCodelistsCacheService } from './gcs-codelists-cache.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GcsProgramReqDataService {
  //  // OLD SCHEME (used only to populate the new field def table)
  //  coldefstr = `
  //id int   //Identity Key|nolist|show=hide
  //programcode string   //Program|val(required)|nolist|upd(show=readonly)|add(show=readonly)|sel(tbl,program)|width=350px
  //categorycode string   //Category|val(required)|sel(codeset,category)|width=250px
  //description string   //Description|val(required)|text|width=300px
  //coursesrequired int   //Required Courses|val(required)
  //reportseq int   //Report Seq|val(required)
  //`;

  tableid = 'programreq';// define our table id
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
  getlistbyprogramcode(programcode: string) {
    return this.gcsdatasvc.getlist('programreqs_get', { programcode }, this.flddefs());
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('programreq_get', { id }, this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('programreq_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('programreq_insert', rec, this.flddefs());
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('programreq_delete', rec);
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: this.tableid, keycsv: rec.programcode + ',' + rec.categorycode }, this.flddefs());
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
      this.getlistbyprogramcode(rec.programcode).subscribe({
        next: (list) => {
          // look through the list to see if the record already exists
          for (let i = 0, dbrec; dbrec = list[i]; i++) {
            if (dbrec.categorycode === rec.categorycode) {
              // record found on db:  for adds or if a key field has changed, indicate it's a duplicate
              if (dbrec.id != rec.id) {// note that the dbrec.id is a string type whereas the rec.id is a number type so the compare cannot be ===
                errmsg = '"' + this.codelistscachesvc.getSelVal('codeset_category', dbrec.categorycode) + '" is already defined.';
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