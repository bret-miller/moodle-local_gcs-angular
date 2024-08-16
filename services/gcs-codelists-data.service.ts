import { Injectable } from '@angular/core';
import { GcsCodeDataService } from './gcs-code-data.service';
import { GcsDataService } from './gcs-data.service';
import { GcsProgramDataService } from './gcs-program-data.service';
import { map } from 'rxjs';
import { GcsStudentDataService } from './gcs-student-data.service';
import { GcsCoursesDataService } from './gcs-courses-data.service';
import { GcsSchAvailableDataService } from './gcs-sch-available-data.service';
import { MdlUserDataService } from './mdl-user-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { fldDef } from './gcs-table-field-defs-cache.service';

@Injectable({
  providedIn: 'root'
})
export class GcsCodelistsDataService {
  private codelists: any = {};// cached code lists used by selects or other code lookups

  // class-level queue arrays.  queueCodeListRef adds to these arrays and getQueuedCodeLists processes them
  mdlreqs: { index: number, methodname: string, args: {} }[] = [];
  refqueue: any[] = [];// build our list of dropdowns keyed on unique code

  constructor(
    private gcsdatasvc: GcsDataService,
    public flddefdatasvc: GcsTableFieldDefService,
    public codetbldatasvc: GcsCodeDataService,
    private pgmdatasvc: GcsProgramDataService,
    private studatasvc: GcsStudentDataService,
    public crsdatasvc: GcsCoursesDataService,// needed by gcs-classes-data.service
    private schdatasvc: GcsSchAvailableDataService,
    private userdatasvc: MdlUserDataService,
  ) {
  }

  loadDependentCodeLists(flddefs: fldDef[]): any {
    this.loadCodeListsFor(flddefs)// add requests for each code list found in flddefs
    this.queueCodeListRef('codeset_tableid');// add request for tableids

    // this will get all the code lists in one call and then from the result array, build the code list and lookup dictionary for each one
    return this.getQueuedCodeLists();
  }

  private loadCodeListsFor(flddefs: fldDef[]): any {
    // create a list of requests for each code list found in flddefs
    flddefs?.forEach(fld => {
      // each column (if not already loaded)
      if (fld.addsellistid) {
        this.queueCodeListRef(fld.addsellistid);
      }
      if (fld.updsellistid && fld.updsellistid !== fld.addsellistid) {
        this.queueCodeListRef(fld.updsellistid);
      }
    });
  }

  queueCodeListRef(sellist: string): boolean {
    let ar = sellist.split('_');
    // if bad name or already in list, bail
    if (ar.length < 2 || this.codelists[sellist]) {
      return false;
    }

    // check if already in refqueue
    for (let i = 0; i < this.refqueue.length; i++)
      if (this.refqueue[i].sellist === sellist) return false;

    let i = this.mdlreqs.length;
    let req = null;
    // add to list
    if (ar[0] === 'tbl') {
      switch (ar[1]) {
        case 'program':
          req = this.pgmdatasvc.buildcodelistreq(i);
          this.refqueue.push({ sellist: sellist, svc: this.pgmdatasvc });// for adding returned lists to codelists
          break;
        case 'scholarship':
          req = this.schdatasvc.buildcodelistreq(i);
          this.refqueue.push({ sellist: sellist, svc: this.schdatasvc });// for adding returned lists to codelists
          break;
        case 'student':
          req = this.studatasvc.buildcodelistreq(i);
          this.refqueue.push({ sellist: sellist, svc: this.studatasvc });// for adding returned lists to codelists
          break;
        case 'user':
          req = this.userdatasvc.buildcodelistreq(i);
          this.refqueue.push({ sellist: sellist, svc: this.userdatasvc });// for adding returned lists to codelists
          break;
        case 'course':
          req = this.crsdatasvc.buildcodelistreq(i);
          this.refqueue.push({ sellist: sellist, svc: this.crsdatasvc });// for adding returned lists to codelists
          break;
        case 'instructor':
          req = this.userdatasvc.buildcodelistreq(i, 'users_get_instructors');
          this.refqueue.push({ sellist: sellist, svc: this.userdatasvc });// for adding returned lists to codelists
          break;
        default:
          break;
      }
    } else if (ar[0] === 'codeset') {
      req = this.codetbldatasvc.buildcodelistreq(i, { codeset: sellist.substring(8) });
      this.refqueue.push({ sellist: sellist, svc: this.codetbldatasvc });// for adding returned lists to codelists
    }

    if (req) {
      this.mdlreqs.push(req);// for mdl call
    }
    return true;
  }

  getQueuedCodeLists() {
    // this will get all the code lists queued in mdlreqs in one call and then build the code list and lookup dictionary for each one
    return this.gcsdatasvc.getlists(this.mdlreqs).pipe(map(mdlarray => {
      let ret = true;// assume success
      ret = (!this.gcsdatasvc.exceptionHandler(mdlarray) && Array.isArray(mdlarray));
      if (ret) {
        // process each returned list
        mdlarray.every((mdl, i) => {
          ret = !this.gcsdatasvc.exceptionHandler(mdl);
          if (ret) {
            let list: any[] = mdl.data;

            // add the codelist
            let ref = this.refqueue[i];
            this.addCodeList(ref.sellist, list, ref.svc);
          }
          return ret;// stop if error
        });
        this.mdlreqs = [];
        this.refqueue = [];
      }
      return ret;
    }));
  }

  // build a code list and lookup dictionary
  addCodeList(sellist: string, list: any[], svc: any) {
    // add an item for each codelist.  It contains 2 sub-items:
    // list: the codeset list from moodle
    // lookup: a key, value dictionary. The code is the key and the value contains the record from list, a code and display description.
    let a: any = {};
    this.codelists[sellist] = a;// save off, keyed on list code

    let codelist: any[] = [];
    a.list = codelist;
    let lookup: any = {};
    a.lookup = lookup;

    // copy to new list and populate a code dictionary for quick description lookups
    list.forEach(rec => {
      let r: any = {};
      r.code = (svc.buildKey ? r.code = svc.buildKey(rec) : rec.code);// build the key if service has a buildKey method
      r.description = (svc.buildDesc ? svc.buildDesc(rec) : rec.description);// build the description if service has a buildDesc method
      r.rec = rec;// in case the original record is needed
      codelist.push(r);// add each record to the code list

      lookup[r.code] = r;// add each record to the code list keyed on code
    });

    // sort by description
    codelist.sort((t1, t2) => {
      if (t1.description > t2.description) { return 1; }
      if (t1.description < t2.description) { return -1; }
      return 0;
    });
  }

  // select list
  getSelList(selkey: string) {
    let a = this.codelists[selkey];
    if (a && a.list) {
      return a.list;
    }
    return [];
  }

  // select list
  getSelVal(selkey: string, code: string): string {
    let r = this.getRec(selkey, code);
    return r ? r.description : '';
  }

  // select list
  getRec(selkey: string, code: string): any {
    let a = this.codelists[selkey];
    if (a && a.lookup) return a.lookup[code];
    return null;
  }

  getDlgCfg(tableid: string) {
    try {
      return JSON.parse(this.getSelVal('codeset_tableid', tableid));// get the dialog properties for this table
    } catch (e) {
      return { dlg: { width: '80%', height: '80%', title: 'Record' } };
    }
  }
}