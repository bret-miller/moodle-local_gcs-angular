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
export class GcsStudentDataService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //Student Id|show=readonly|width=100px
legallastname string   //Legal Last Name|val(required)|width=200px
legalfirstname string   //Legal First Name|val(required)|width=200px
legalmiddlename string   //Legal Middle Name|nolist|width=200px
preferredfirstname string   //Preferred First Name|nolist|width=200px
programcode string   //Program|val(required)|sel(tbl,program)|width=350px|newline
statuscode string   //Status|val(required)|sel(codeset,status)|width=200px
scholarshipeligible string   //Scholarship Eligible|nolist|width=250px|sel(codeset,scholarship_category)
isgraduated int   //Is Graduated?|bool
donotemail int   //Do Not Email|bool|nolist
acceptancedate int   //Acceptance Date|date
exitdate int   //Exit Date|nolist|date
birthdate int   //Birth Date|date|nolist
birthplace string   //Birth Place|nolist|width=300px
address string   //Address|nolist|width=300px|newline
address2 string   //Address2|nolist|width=300px
city string   //City|nolist|width=200px|newline
stateprovince string   //State|nolist|width=100px
zip string   //Zip Code|nolist|width=150px
country string   //Country|nolist|width=200px
ssn string   //SSN|nolist|width=140px|newline
idnumber string   //External ID|nolist|width=110px
userid int   //Moodle User ID|val(required)|sel(tbl,user)|width=300px|nolist
citizenship string   //Citizenship|nolist|sel(codeset,citizenship)|width=200px
alienregnumber string   //Alien Reg Number|nolist
visatype string   //Visa Type|nolist
ethniccode string   //Ethnic Code|nolist|width=200px|sel(codeset,ethnic)
isveteran int   //Is Veteran?|bool|nolist
regfoxemails string   //Regfox Emails (comma-separated)|nolist|width=550px
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
    return this.gcsdatasvc.getlist('students_get_all', {}, this.coldefs);
  }

  // get list of students with unsigned enrollment agreements
  getlistunsignedenrollmentagreements() {
    return this.gcsdatasvc.getlist('students_get_with_unsigned_enrollment_agreements', {}, this.coldefs);
  }

  // get list of students with scholarships
  getlistscholarships() {
    return this.gcsdatasvc.getlist('students_get_with_scholarships', {}, this.coldefs);
  }

  // get a req object to be used later to get the list
  buildcodelistreq(i: number) {
    return this.gcsdatasvc.fmtgcsreq(i, 'students_get_all', {});
  }

  // read specific record from server (acually returns a list of 1 or 0 records)
  getrecbyid(id: string) {
    return this.gcsdatasvc.getlist('students_get', { id }, this.coldefs);
  }

  // read specific record from server
  getloggedinrec() {
    return this.gcsdatasvc.getrec('student_get_logged_in', {}, this.coldefs);
  }

  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('students_update', rec, this.coldefs);
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('students_insert', rec, this.coldefs);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('students_delete', rec);
  }

  // get list of table record dependencies
  getdependencies(rec: any) {
    return this.gcsdatasvc.getlist('table_record_dependencies', { tablecode: 'student', keycsv: rec.id }, this.coldefs);
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
    let a = this.gcsdatasvc.initRec(this.coldefs);
    // set default values
    a.statuscode = 'ACT';
    a.programcode = 'MCE';
    a.citizenship = 'US';
    a.acceptancedate = new Date();
    return a;
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
    return rec.id;
  }

  buildDesc(rec: any) {
    return (rec.legallastname + ', ' + rec.legalfirstname + ' ' + rec.legalmiddlename).trimEnd();
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
