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
export class GcsSchGivenDataService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //Identity Key|nolist|show=hide
studentid int   //Student|val(required)|show=readonly|nolist|readonly|sel(tbl,student)|width=350px
requestdate int   //Request date|val(required)|date|readonly
cadinfoauth int   //CAD info auth?|nolist|bool
termyear int   //Year|val(required)|width=100px|newline
programcode string   //Code|val(required)|sel(tbl,program)|width=300px
category string   //Scholarship|val(required)|sel(tbl,scholarship)|width=300px
occupation string   //Occupation|nolist|show=hide|width=300px|newline
employer string   //Employer|nolist|width=300px|show=hide
perunitamount double   //Per unit amount|val(required)|nolist|width=150px|newline
coursemax int   //Maximum courses|val(required)|nolist|width=150px
eligiblefrom int   //Eligible from|val(required)|date|nolist|newline
eligiblethru int   //Eligible thru|val(required)|nolist|date|nolist
decision string   //Decision|sel(codeset,scholarship_approve)|newline
reviewdate int   //Review date|date
studentnotified int   //Student notified|date|nolist
comments string   //Comments|nolist|width=520px|text|newline
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
    return this.gcsdatasvc.getlist('sch_given_get_all', { stuid }, this.coldefs);
  }

  // get list conditionally based on stuid parm (stuid='' will return all records)
  getlist(stuid: string) {
    if (!stuid) {
      // also change the coldef to show student name in list
      this.coldefs.every(coldef => {
        if (coldef.key === 'studentid') {
          coldef.islist = true;
          coldef.issort = true;
          return false;
        }
        return true;
      });
      this.displayedColumns = this.gcsdatasvc.getDisplayedCols(this.coldefs);// generated from coldefs
    } else {
      // also change the coldef to not show student name in list
      this.coldefs.every(coldef => {
        if (coldef.key === 'studentid') {
          coldef.islist = false;
          coldef.issort = false;
          return false;
        }
        return true;
      });
      this.displayedColumns = this.gcsdatasvc.getDisplayedCols(this.coldefs);// generated from coldefs
    }

    // get the scholarships for the student or all students if stuid is empty
    return this.getlistbystuid(stuid);
  }

  // read specific record from server
  getrecbyid(id: string) {
    return this.gcsdatasvc.getrec('sch_given_get', { id }, this.coldefs);
  }

  // read specific record from server (returns a list of 1 or 0 records)
  getrecbylogical(stuid :number, termyear: number) {
    return this.gcsdatasvc.getlist('sch_given_get_logical', { stuid, termyear }, this.coldefs);
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
    return this.gcsdatasvc.updrec('sch_given_update', rec, this.coldefs);
  }

  // add new record
  addrec(rec: any) {
    return this.gcsdatasvc.addrec('sch_given_insert', rec, this.coldefs);
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
    return a;
  }

  valRec(rec: any, coldefs: columnSchema[]) {
    // note that we want to use the coldefs from the dialog, not the service's coldefs
    let isvalid = this.gcsdatasvc.valRec(coldefs, this.codelistsdatasvc, rec);
    //if (isvalid) {
    // custom validation
    //if (rec['termyear < 2000) {
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
