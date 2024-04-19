/*
+----------------------------------------------------------------------------------------
| This service defines the record and makes moodle service calls for the table
+----------------------------------------------------------------------------------------
*/
import { Injectable, Pipe, PipeTransform } from '@angular/core';

import { GcsDataService, columnSchema } from 'services/gcs-data.service';

@Injectable({
  providedIn: 'root'
})
export class GcsSettingsService {
  // (coldefs is used throughout this app to operate on the record)
  coldefs = this.gcsdatasvc.parseMoodleRecStr(`
menuadmin string   //program management menu item name
menustudent string   //student resources menu item name
logourl string   //logo url
printlogoenabled int   //print logo on reports?
version int   //version number
release string   //release id
`); // parse the moodlefields string into the columnsSchema array

  /*
  +------------------------
  | Initialize the service
  +------------------------*/
  constructor(
    private gcsdatasvc: GcsDataService,
  ) {
  }

  /*
  +----------------------
  | moodle service calls
  +----------------------*/

  // read settings record from server
  getrec() {
    return this.gcsdatasvc.getrec('settings_get', { }, this.coldefs);
  }
}
