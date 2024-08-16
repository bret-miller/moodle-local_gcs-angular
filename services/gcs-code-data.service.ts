/*
+----------------------------------------------------------------------------------------
| This service defines the record and makes moodle service calls
+----------------------------------------------------------------------------------------
*/
import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsCodelistsDataService } from './gcs-codelists-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';

@Injectable({
  providedIn: 'root'
})
export class GcsCodeDataService {
//  // OLD SCHEME (used only to populate the new field def table)
//  coldefstr = `
//id int   //Identity Key|nolist|show=hide
//codeset string   //Code Set|val(required)|nolist|upd(show=readonly)|width=200px
//code string   //Code|val(required)|upd(show=readonly)|width=100px
//description string   //Description|val(required)|width=400px
//`;

  tableid = 'code';// define our table id
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

  // get list for dropdown
  getlist() {
    return this.gcsdatasvc.getlist('codesets_get', {}, this.flddefs());
  }

  // get selected list
  buildcodesetlistreq(i: number, parms: {}) {
    return this.gcsdatasvc.fmtgcsreq(i, 'codesets_get', parms);
  }

  // get selected list
  getlistbycodeset(codeset: string) {
    return this.gcsdatasvc.getlist('codes_get', { codeset }, this.flddefs());
  }

  // get selected list
  buildcodelistreq(i: number, parms: {}) {
    return this.gcsdatasvc.fmtgcsreq(i, 'codes_get', parms);
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('code_get', { id }, this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('code_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('code_insert', rec, this.flddefs());
  }

  // queue the record update
  queueupdrec(rec: any, queue: any[]) {
    return this.gcsdatasvc.queueupdrec('code_update', rec, this.flddefs(), queue);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('code_delete', rec);
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: 'codeset.' + rec.codeset, keycsv: rec.code }, this.flddefs());
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

  addCodeLists(codelists: any, flddefs: fldDef[]) {
    // for each column designated with a codeset table, look up and save its code list, plus convert it into a key=value pair dictionary object for dynamic lookups.
    if (codelists) {
      // in codelists, build a codeset: object for each dropdown=codeset_ column.  It contains 2 sub-items:
      // list: the codeset list from moodle
      // lookup: a dictionary object with each code populated with its description as the value.
      flddefs.forEach(col => {
        // each dropdown=codeset_ column (if codeset is not already loaded)
        if (col.datatype === 'dropdown' && col.sellistid.indexOf('codeset_') === 0 && !codelists[col.sellistid]) {
          let codeset = col.sellistid.substring(8);// get codeset name
          // get list subset from server
          this.getlistbycodeset(codeset).subscribe(list => {
            // populate a code dictionary for quick description lookups
            let a: any = {};
            codelists[col.sellistid] = a;// save off code list dictionary

            let codelist: any[] = [];
            a.list = codelist;
            let lookup: any = {};
            a.lookup = lookup;

            // add a blank record to the top of the list when the column is not required
            //if (!col.selreq) {
            //  let r: any = {};
            //  r.code = '';
            //  r.description = '';
            //  codelist.push(r);// add each record to the code list
            //}

            // copy to new list and populate a code dictionary for quick description lookups
            list.forEach(rec => {
              let r: any = {};
              r.code = rec.code;
              r.description = rec.description;
              codelist.push(r);// add each record to the code list

              lookup[rec.code] = rec.description;// add each record to the code list keyed on id
            });

            // special case:  for codesets, add the codelists as well
            if (codeset === 'codesets') {
              this.getlist().subscribe({
                // success
                next: list => {
                  // add the codelists as well
                  list.forEach(rec => {
                    let r: any = {};
                    r.code = rec.codeset;
                    r.description = rec.codeset;
                    codelist.push(r);// add each record to the code list

                    lookup[rec.code] = rec.description;// add each record to the code list keyed on id
                  });
                },

                // error
                error: (error) => {
                  console.error('Error:', error);
                },
              });
            }
          });
        }
      });
    }
  }
}
