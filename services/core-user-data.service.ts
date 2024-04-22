/*
+----------------------------------------------------------------------------------------
| This service defines the record and makes moodle service calls for the table
+----------------------------------------------------------------------------------------
*/
import { Injectable, Pipe, PipeTransform } from '@angular/core';

import { GcsDataService, columnSchema } from 'services/gcs-data.service';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CoreUserDataService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
id int   //Identity Key|nolist|show=hide
username string  //The username|nolist|width=200px
firstname string  //The first name of the user|nolist|width=200px
lastname string  //The family name of the user|nolist|width=200px
fullname string   //The fullname of the user|width=350px
email string  //An email address|nolist|width=200px
address string   //Address|nolist|width=300px|newline
phone1 string  //Phone 1|nolist|width=200px
phone2 string  //Phone 2|nolist|width=200px
department string  //department|nolist|width=200px
institution string  //institution|nolist|width=200px
idnumber string  //GCS ID|nolist|width=100px
interests string  //user interests CSV|nolist|width=200px
firstaccess int  //first access to the site|nolist|date
lastaccess int  //last access to the site|nolist|date
auth string  //Auth plugins|nolist|width=200px
suspended int  //Suspend user account|nolist|bool
confirmed int  //Active user|nolist|bool
lang string  //Language code|nolist|width=50px
calendartype string  //Calendar type|nolist|width=200px
theme string  //Theme name|nolist|width=200px
timezone string  //Timezone code|nolist|width=200px
mailformat int  //Mail format code|nolist|bool
description string  //User profile description|nolist|width=200px|text
descriptionformat int  //int format|nolist|width=20px
city string   //City|nolist|width=200px
country string  //Home country code|nolist|width=30px
profileimageurlsmall string   //User image|nolist|width=200px
profileimageurl string   //User image profile URL|nolist|width=200px
`); // parse the moodlefields string into the columnsSchema array
  displayedColumns: string[] = this.gcsdatasvc.getDisplayedCols(this.coldefs);// generated from coldefs

  /*
  +------------------------
  | Initialize the service
  +------------------------*/
  constructor(
    private gcsdatasvc: GcsDataService,
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

  // read specific record from server
  getrecbyid(id: string): Observable<any> {
    return this.gcsdatasvc.getmdllistby('core_user_get_users_by_field', { 'field': 'id', 'values': [id.toString()] }, this.coldefs).pipe(map(list => {
      if (list.length > 0) {
        return list[0];
      }
      return this.initRec();
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
    // set default values
    return a;
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
    return (rec.lastname + ', ' + rec.firstname).trimEnd();
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
