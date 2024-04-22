/*
+----------------------------------------------------------------------------------------
| This service defines the record and makes moodle service calls
+----------------------------------------------------------------------------------------
*/
import { Injectable, Pipe, PipeTransform } from '@angular/core';

import { GcsDataService, columnSchema } from 'services/gcs-data.service';
import { map } from 'rxjs';
import { GcsCodelistsDataService } from './gcs-codelists-data.service';

@Injectable({
  providedIn: 'root'
})
export class GcsClassesTakenDataService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //key|nolist|show=hide
studentid int   //Student|val(required)|show=readonly|nolist|sel(tbl,student)|width=350px
idnumber string   //External ID|nolist|show=hide
termyear int   //Year|val(required)|width=100px
termcode string   //Term|val(required)|width=150px|sel(codeset,term)
coursecode string   //Course|val(required)|sel(tbl,course)|width=350px
credittypecode string   //Credit Type|val(required)|sel(codeset,cr_type)|width=200px|newline
gradecode string   //Grade|sel(codeset,grade)|width=125px
elective int   //Elective|bool|nolist
registrationdate int   //Registration Date|val(required)|date
canceldate int   //Canceled|date
completiondate int   //Completed|date
tuitionpaid double   //Tuition paid|nolist|newline
scholarshippedamount double   //Sch amt|nolist
scholarshippedadjustment double   //Sch adj|nolist
fee double   //Fee|nolist
classtuition double   //Class Tuition|nolist
ordertotal double   //Order total|nolist
studentpaid double   //Student paid|nolist
manualpricing int   //Manual pricing|bool|nolist
comments string   //Comments|nolist|width=600px|text
shorttitleoverride string   //Short title Override|nolist|width=320px|newline
titleoverride string   //Title Override|nolist|width=520px
coursehoursoverride int   //Hours|nolist|width=120px
assignedcoursecode string   //Assigned course code|nolist|sel(tbl,course)|width=300px
scholarshipid int   //Scholarship ID|nolist
agreementid int   //Enr Agr ID|nolist|show=readonly|popup(enrollagreement)|width=130px
agreementsigned int   //Enr Agr Signed|date|nolist
ordernumber int   //Order No|nolist
linenumber int   //Line No|nolist
regfoxcode string   //RegFox code|nolist
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
  getlistbystuid(stuid: string) {
    return this.gcsdatasvc.getlist('classes_taken_get_all', { stuid }, this.coldefs);
  }

  getlistunsignedbystuid(stuid: string) {
    return this.gcsdatasvc.getlist('classes_taken_get_unsigned', { stuid }, this.coldefs);
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('classes_taken_get', { id }, this.coldefs);
  }

  // read specific record from server
  getrecbystuyear(stuid: number, termyear: number) {
    return this.gcsdatasvc.getrec('classes_taken_get_by_stu_year', {stuid, termyear}, this.coldefs);
  }
  
  // update specific record
  updrec(rec: any) {
    return this.gcsdatasvc.updrec('classes_taken_update', rec, this.coldefs);
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('classes_taken_insert', rec, this.coldefs);
  }

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(rec: any) {
    return this.gcsdatasvc.delrec('classes_taken_delete', rec);
  }

  // get student's class list
  getfilteredstulist(stuid: string, inclCurrentlyEnrolled: boolean = true, inclPass: boolean = true, inclFail: boolean = true, inclAudits: boolean = false, inclCanceled: boolean = false) {
    return this.getlistbystuid(stuid).pipe(map(list => {
      let newlist:any[] = [];
      list.forEach(rec => {
        // filter on requested statuses
        if (
          (inclCurrentlyEnrolled && (rec.gradecode === 'INC' || (!rec.completiondate && !rec.gradecode && !rec.canceldate))) ||
          (inclPass && rec.completiondate && this.codelistsdatasvc.getSelVal('codeset_pass_fail', rec.gradecode) === 'PAS') ||
          (inclFail && this.codelistsdatasvc.getSelVal('codeset_pass_fail', rec.gradecode) === 'FAL') ||
          (inclAudits && rec.credittypecode === 'AUD') ||
          (inclCanceled && (rec.canceldate || this.codelistsdatasvc.getSelVal('codeset_pass_fail', rec.gradecode) === 'DRP'))
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

  // fill method
  copyRec(fromrec: any, torec: any) {
    return this.gcsdatasvc.copyRec(this.coldefs, fromrec, torec);
  }

  // generate a new flds object
  initRec() {
    let a = this.gcsdatasvc.initRec(this.coldefs);
    a.termyear = new Date().getFullYear();
    a.credittypecode = 'CR';
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
