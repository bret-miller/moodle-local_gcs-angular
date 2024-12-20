import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { Observable, map } from 'rxjs';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';

@Injectable({
  providedIn: 'root'
})
export class CoreUserDataService {
//  // OLD SCHEME (used only to populate the new field def table)
//  coldefstr = `id int   //Identity Key|nolist|show=hide
//username string  //The username|nolist|width=200px
//firstname string  //The first name of the user|nolist|width=200px
//lastname string  //The family name of the user|nolist|width=200px
//fullname string   //The fullname of the user|width=350px
//email string  //An email address|nolist|width=200px
//address string   //Address|nolist|width=300px|newline
//phone1 string  //Phone 1|nolist|width=200px
//phone2 string  //Phone 2|nolist|width=200px
//department string  //department|nolist|width=200px
//institution string  //institution|nolist|width=200px
//idnumber string  //GCS ID|nolist|width=100px
//interests string  //user interests CSV|nolist|width=200px
//firstaccess int  //first access to the site|nolist|date
//lastaccess int  //last access to the site|nolist|date
//auth string  //Auth plugins|nolist|width=200px
//suspended int  //Suspend user account|nolist|bool
//confirmed int  //Active user|nolist|bool
//lang string  //Language code|nolist|width=50px
//calendartype string  //Calendar type|nolist|width=200px
//theme string  //Theme name|nolist|width=200px
//timezone string  //Timezone code|nolist|width=200px
//mailformat int  //Mail format code|nolist|bool
//description string  //User profile description|nolist|width=200px|text
//descriptionformat int  //int format|nolist|width=20px
//city string   //City|nolist|width=200px
//country string  //Home country code|nolist|width=30px
//profileimageurlsmall string   //User image|nolist|width=200px
//profileimageurl string   //User image profile URL|nolist|width=200px
//`;

  tableid = 'class';// define our table id
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

  // read specific record from server
  getrecbyid(id: string): Observable<any> {
    return this.gcsdatasvc.getmdllistby('core_user_get_users_by_field', { 'field': 'id', 'values': [id.toString()] }, this.flddefs()).pipe(map(list => {
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
    // set default values
    return a;
  }

  buildKey(rec: any) {
    return rec.id;
  }

  buildDesc(rec: any) {
    return (rec.lastname + ', ' + rec.firstname).trimEnd();
  }
}
