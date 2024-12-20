import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsCodelistsCacheService } from './gcs-codelists-cache.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GcsStudentDataService {
//  // OLD SCHEME (used only to populate the new field def table)
//  coldefstr = `
//id int   //Student Id|show=readonly|width=100px
//legallastname string   //Legal Last Name|val(required)|width=200px
//legalfirstname string   //Legal First Name|val(required)|width=200px
//legalmiddlename string   //Legal Middle Name|nolist|width=200px
//preferredfirstname string   //Preferred First Name|nolist|width=200px
//programcode string   //Program|val(required)|sel(tbl,program)|width=350px|newline
//statuscode string   //Status|val(required)|sel(codeset,status)|width=200px
//scholarshipeligible string   //Scholarship Eligible|nolist|width=250px|sel(codeset,scholarship_category)
//isgraduated int   //Is Graduated?|bool
//donotemail int   //Do Not Email|bool|nolist
//acceptancedate int   //Acceptance Date|date
//exitdate int   //Exit Date|nolist|date
//birthdate int   //Birth Date|date|nolist
//birthplace string   //Birth Place|nolist|width=300px
//address string   //Address|nolist|width=300px|newline
//address2 string   //Address2|nolist|width=300px
//city string   //City|nolist|width=200px|newline
//stateprovince string   //State|nolist|width=100px
//zip string   //Zip Code|nolist|width=150px
//country string   //Country|nolist|width=200px
//ssn string   //SSN|nolist|width=140px|newline
//idnumber string   //External ID|nolist|width=110px
//userid int   //Moodle User ID|val(required)|sel(tbl,user)|width=300px|nolist
//citizenship string   //Citizenship|nolist|sel(codeset,citizenship)|width=200px
//alienregnumber string   //Alien Reg Number|nolist
//visatype string   //Visa Type|nolist
//ethniccode string   //Ethnic Code|nolist|width=200px|sel(codeset,ethnic)
//isveteran int   //Is Veteran?|bool|nolist
//regfoxemails string   //Regfox Emails (comma-separated)|nolist|width=550px
//`;

  tableid = 'student';// define our table id
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
    return this.gcsdatasvc.getlist('students_get_all', {}, this.flddefs());
  }

  // get list of students with unsigned enrollment agreements
  getlistunsignedenrollmentagreements() {
    return this.gcsdatasvc.getlist('students_get_with_unsigned_enrollment_agreements', {}, this.flddefs());
  }

  // get list of students with scholarships
  getlistscholarships() {
    return this.gcsdatasvc.getlist('students_get_with_scholarships', {}, this.flddefs());
  }

  // get a req object to be used later to get the list
  buildcodelistreq(i: number, x: any) {
    return this.gcsdatasvc.fmtgcsreq(i, 'students_get_all', {});
  }

  // read specific record from server (acually returns a list of 1 or 0 records)
  getrecbyid(id: string) {
    return this.gcsdatasvc.getlist('students_get', { id }, this.flddefs());
  }

  // read specific record from server
  getloggedinrec() {
    return this.gcsdatasvc.getrec('student_get_logged_in', {}, this.flddefs());
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('students_update', rec, this.flddefs());
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('students_insert', rec, this.flddefs());
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('students_delete', rec);
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
  coldefs(): fldDef[] {
    return [...this.flddefs(), ...this.addtlcols];
  }

  // fill method
  copyRec(fromrec: any, torec: any) {
    return this.gcsdatasvc.copyRec(this.flddefs(), fromrec, torec);
  }

  // generate a new flds object
  initRec() {
    let a = this.gcsdatasvc.initRec(this.flddefs());
    // set default values
    a.statuscode = 'ACT';
    a.programcode = 'MCE';
    a.citizenship = 'US';
    a.acceptancedate = new Date();
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
            if (dbrec.userid === rec.userid) {
              // record found on db:  for adds or if a key field has changed, indicate it's a duplicate
              if (dbrec.id != rec.id) {// note that the dbrec.id is a string type whereas the rec.id is a number type so the compare cannot be ===
                errmsg = 'The moodle user "' + this.codelistscachesvc.getSelVal('tbl_user', dbrec.userid) +
                  '" is already associated with GCS student id=' + dbrec.id + ':  ' + dbrec.legallastname + ', ' + dbrec.legalfirstname + ' ' + dbrec.legalmiddlename + '.';
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
    return rec.id;
  }

  buildDesc(rec: any) {
    return (rec.legallastname + ', ' + rec.legalfirstname + ' ' + rec.legalmiddlename).trimEnd();
  }
}
