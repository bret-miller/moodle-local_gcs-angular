import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';
import { GcsCodelistsCacheService } from './gcs-codelists-cache.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GcsSchGivenDataService {
//  // OLD SCHEME (used only to populate the new field def table)
//  coldefstr = `
//id int   //Identity Key|nolist|show=hide
//studentid int   //Student|val(required)|show=readonly|nolist|readonly|sel(tbl,student)|width=350px
//requestdate int   //Request date|val(required)|date|readonly
//cadinfoauth int   //CAD info auth?|nolist|bool
//termyear int   //Year|val(required)|width=100px|newline
//programcode string   //Code|val(required)|sel(tbl,program)|width=300px
//category string   //Scholarship|val(required)|sel(tbl,scholarship)|width=300px
//occupation string   //Occupation|nolist|show=hide|width=300px|newline
//employer string   //Employer|nolist|width=300px|show=hide
//perunitamount double   //Per unit amount|val(required)|nolist|width=150px|newline
//coursemax int   //Maximum courses|val(required)|nolist|width=150px
//eligiblefrom int   //Eligible from|val(required)|date|nolist|newline
//eligiblethru int   //Eligible thru|val(required)|nolist|date|nolist
//decision string   //Decision|sel(codeset,scholarship_approve)|newline
//reviewdate int   //Review date|date
//studentnotified int   //Student notified|date|nolist
//comments string   //Comments|nolist|width=520px|text|newline
//`;

  tableid = 'scholarshipgiven';// define our table id
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
  getlistbystuid(stuid: string) {
    return this.gcsdatasvc.getlist('sch_given_get_all', { stuid }, this.flddefs());
  }

  // get list conditionally based on stuid parm (stuid='' will return all records)
  getlist(stuid: string) {
    if (!stuid) {
      // also change the flddef to show student name in list
      this.flddefs().every(flddef => {
        if (flddef.fieldname === 'studentid') {
          flddef.islist = true;
          return false;
        }
        return true;
      });
      this.displayedColumns = this.flddefscachedatasvc.getDisplayedCols(this.coldefs());// generate displayed columns list
    } else {
      // also change the flddef to not show student name in list
      this.flddefs().every(flddef => {
        if (flddef.fieldname === 'studentid') {
          flddef.islist = false;
          return false;
        }
        return true;
      });
      this.displayedColumns = this.flddefscachedatasvc.getDisplayedCols(this.coldefs());// generate displayed columns list
    }

    // get the scholarships for the student or all students if stuid is empty
    return this.getlistbystuid(stuid);
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('sch_given_get', { id }, this.flddefs());
  }

  // read specific record from server (returns a list of 1 or 0 records)
  getrecbylogical(stuid: number, termyear: number) {
    return this.gcsdatasvc.getlist('sch_given_get_logical', { stuid, termyear }, this.flddefs());
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('sch_given_delete', rec);
  }

  // add/update specific record
  addupdrec(rec: any, origrec: any) {
    // trust original rec to determine whether add/upd
    if (origrec.id) {
      return this.updrec(rec);
    }
    return this.addrec(rec);
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('sch_given_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('sch_given_insert', rec, this.flddefs());
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: this.tableid, keycsv: rec.id }, this.flddefs());
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
      this.getlistbystuid(rec.studentid).subscribe({
        next: (list) => {
          // look through the list to see if the record already exists
          for (let i = 0, dbrec; dbrec = list[i]; i++) {
            if (dbrec.termyear === rec.termyear) {
              // record found on db:  for adds or if a key field has changed, indicate it's a duplicate
              if (dbrec.id != rec.id) {// note that the dbrec.id is a string type whereas the rec.id is a number type so the compare cannot be ===
                errmsg = 'A scholarship has already been created for ' + dbrec.termyear + '.';
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
