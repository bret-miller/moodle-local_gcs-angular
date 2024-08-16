import { Injectable } from '@angular/core';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsTableFieldDefsCacheService, fldDef } from './gcs-table-field-defs-cache.service';

@Injectable({
  providedIn: 'root'
})
export class GcsSettingsService {
  // (flddefs is used throughout this app to operate on the record)
//  coldefstr = `
//menuadmin string   //program management menu item name
//menustudent string   //student resources menu item name
//logourl string   //logo url
//printlogoenabled int   //print logo on reports?
//version int   //version number
//release string   //release id
//`;

  tableid = 'settings';// define our table id
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
  }

  /*
  +----------------------
  | moodle service calls
  +----------------------*/
  // read settings record from server
  getrec() {
    return this.gcsdatasvc.getrec('settings_get', { }, this.flddefs());
  }

  // combined table field definitions plus additional columns for display purposes
  flddefs(): fldDef[] {
    return this.flddefscachedatasvc.getFldDefs(this.tableid);
  }
}
