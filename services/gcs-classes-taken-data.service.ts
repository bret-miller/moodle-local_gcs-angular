/*
+----------------------------------------------------------------------------------------
| This service defines the record and makes moodle service calls
+----------------------------------------------------------------------------------------
*/
import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { Observable, map } from 'rxjs';
import { GcsTableFieldDefService } from 'services/gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';
import { GcsCodelistsCacheService } from './gcs-codelists-cache.service';
import { GcsClassesDataService } from './gcs-classes-data.service';

@Injectable({
  providedIn: 'root'
})
export class GcsClassesTakenDataService {
  //  // OLD SCHEME (used only to populate the new field def table)
  //  coldefstr = `
  //id int   //key|nolist|show=hide
  //studentid int   //Student|val(required)|show=readonly|nolist|sel(tbl,student)|width=350px
  //idnumber string   //External ID|nolist|show=hide
  //termyear int   //Year|val(required)|width=100px
  //termcode string   //Term|val(required)|width=150px|sel(codeset,term)
  //coursecode string   //Course|val(required)|sel(tbl,course)|width=350px
  //credittypecode string   //Credit Type|val(required)|sel(codeset,cr_type)|width=200px|newline
  //gradecode string   //Grade|sel(codeset,grade)|width=125px
  //elective int   //Elective|bool|nolist
  //registrationdate int   //Registration Date|val(required)|date
  //canceldate int   //Canceled|date
  //completiondate int   //Completed|date
  //tuitionpaid double   //Tuition paid|nolist|show=hide
  //classtuition double   //Class Tuition|nolist|newline|tooltip=Total class tuition amount
  //studentpaid double   //Student paid|nolist|tooltip=Class tuition amount paid by student 
  //scholarshippedamount double   //Sch amt|nolist|tooltip=Class tuition amount paid by scholarship
  //scholarshippedadjustment double   //Sch adj|nolist|tooltip=Scholarship portion of a refund returned to the scholarship fund
  //fee double   //Fee|nolist|tooltip=Non-tuition fee amount
  //ordertotal double   //Order total|nolist|tooltip=Total revenue for the class (tuition + fee - refund)
  //manualpricing int   //Manual pricing|bool|nolist
  //comments string   //Comments|nolist|width=600px|text
  //shorttitleoverride string   //Short title Override|nolist|width=320px|newline
  //titleoverride string   //Title Override|nolist|width=520px
  //coursehoursoverride int   //Hours|nolist|width=120px
  //assignedcoursecode string   //Assigned course code|nolist|sel(tbl,course)|width=300px
  //scholarshipid int   //Scholarship ID|nolist
  //agreementid int   //Enr Agr ID|nolist|show=readonly|popup(enrollagreement)|width=130px
  //agreementsigned int   //Enr Agr Signed|date|nolist
  //ordernumber int   //Order No|nolist
  //linenumber int   //Line No|nolist
  //regfoxcode string   //RegFox code|nolist
  //`;

  tableid = 'classtaken';// define our table id
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
    private clsdatasvc: GcsClassesDataService,
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
    return this.gcsdatasvc.getlist('classes_taken_get_all', { stuid }, this.flddefs());
  }

  getlist(stuid: string) {
    return this.getlistbystuid(stuid);
  }

  getlistunsignedbystuid(stuid: string) {
    return this.gcsdatasvc.getlist('classes_taken_get_unsigned', { stuid }, this.flddefs());
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('classes_taken_get', { id }, this.flddefs());
  }

  // read stu records by year
  getlistbystuyear(stuid: number, termyear: number) {
    return this.gcsdatasvc.getrec('classes_taken_get_by_stu_year', { stuid, termyear }, this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('classes_taken_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('classes_taken_insert', rec, this.flddefs());
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('classes_taken_delete', rec);
  }

  //// get list of table record dependencies
  //getdependencies(rec: any) {
  //  return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: 'classtaken', keycsv: rec.termyear + ',' + rec.termcode + ',' + rec.coursecode }, this.flddefs());
  //}

  // queue request to get list of table record dependencies
  //queuegetdependencies(rec: any, queue: any[]) {
  //  return this.gcsdatasvc.queuegetlist('table_record_dependencies', { tablecode: 'classtaken', keycsv: rec.termyear + ',' + rec.termcode + ',' + rec.coursecode }, queue);
  //}

  // get student's class list
  getfilteredstulist(stuid: string, inclCurrentlyEnrolled: boolean = true, inclPass: boolean = true, inclFail: boolean = true, inclAudits: boolean = false, inclCanceled: boolean = false) {
    return this.getlistbystuid(stuid).pipe(map(list => {
      let newlist: any[] = [];
      list.forEach(rec => {
        // filter on requested statuses
        if (
          (inclCurrentlyEnrolled && (rec.gradecode === 'INC' || (!rec.completiondate && !rec.gradecode && !rec.canceldate))) ||
          (inclPass && rec.completiondate && this.codelistscachesvc.getSelVal('codeset_pass_fail', rec.gradecode) === 'PAS') ||
          (inclFail && this.codelistscachesvc.getSelVal('codeset_pass_fail', rec.gradecode) === 'FAL') ||
          (inclAudits && rec.credittypecode === 'AUD') ||
          (inclCanceled && (rec.canceldate || this.codelistscachesvc.getSelVal('codeset_pass_fail', rec.gradecode) === 'DRP'))
        ) {
          newlist.push(rec);
        }
      });
      return newlist;
    }));
  }
  /*
  +----------------------
  | Other public methods
  +----------------------*/
  // field definitions for our table
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
    a.credittypecode = 'CR';
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

      // Read for possible duplicate record
      const bnr = this.gcsdatasvc.showNotification('checking for duplicate...', 'save');
      this.getlistbystuyear(rec.studentid, rec.termyear).subscribe({
        next: (list) => {
          // look through the list to see if the record already exists
          for (let i = 0, dbrec; dbrec = list[i]; i++) {// note that the dbrec.id is a string whereas the rec.id is a number type so the compare cannot be ===
            if (dbrec.termcode === rec.termcode && dbrec.coursecode === rec.coursecode) {
              // record found on db:  for adds or if a key field has changed, indicate it's a duplicate
              if (dbrec.id != rec.id) {// note that the dbrec.id is a string type whereas the rec.id is a number type so the compare cannot be ===
                errmsg = '"' + this.codelistscachesvc.getSelVal('tbl_course', dbrec.coursecode) +
                  '" is already defined for the ' + this.codelistscachesvc.getSelVal('codeset_term', dbrec.termcode) + ', ' + dbrec.termyear + ' term.';
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

  compileForDialogMode(isAdd: boolean) {
    return this.flddefdatasvc.getFldDefsForDialogMode(isAdd, this.flddefs());
  }

  buildKey(rec: any) {
    return rec.studentid + '-' + rec.termyear + '-' + rec.termcode + '-' + rec.coursecode;
  }

  buildDesc(rec: any) {
    return rec.coursecode + ' - ' + rec.shorttitle;
  }

  // filter function for classtaken dropdown lists
  filtForDropdown(sellist: string, listrec: any, datarec: any): boolean {
    switch (sellist) {
      // tbl_course=in_term: custom filter lookup to see if the class rec exists for the classtaken termyear & termcode but for the course code of the course rec
      case "tbl_course=in_term":// include only if class offered this term
        const key = datarec.termyear + '-' + datarec.termcode + '-' + listrec.rec.coursecode;// see clsdatasvc.buildKey for the key format to emulate
        return (this.codelistscachesvc.getRec('tbl_class', key) ? true : false);// present?

      default:
        return true;// select it by default
    }
  }
}