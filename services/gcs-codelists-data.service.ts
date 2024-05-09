import { Injectable } from '@angular/core';
import { GcsCodeDataService } from './gcs-code-data.service';
import { GcsDataService, columnSchema } from './gcs-data.service';
import { GcsProgramDataService } from './gcs-program-data.service';
import { Observable, map } from 'rxjs';
import { GcsStudentDataService } from './gcs-student-data.service';
import { GcsCoursesDataService } from './gcs-courses-data.service';
import { GcsSchAvailableDataService } from './gcs-sch-available-data.service';
import { MdlUserDataService } from './mdl-user-data.service';

@Injectable({
  providedIn: 'root'
})
export class GcsCodelistsDataService {
  codelists: any = {};// cached code lists used by selects or other code lookups

  // class-level queue arrays.  queueCodeListRef adds to these arrays and getQueuedCodeLists processes them
  mdlreqs: { index: number, methodname: string, args: {} }[] = [];
  refarray: any[] = [];// build our list of selects keyed on unique code

  constructor(
    private gcsdatasvc: GcsDataService,
    private codetbldatasvc: GcsCodeDataService,
    private pgmdatasvc: GcsProgramDataService,
    private studatasvc: GcsStudentDataService,
    public crsdatasvc: GcsCoursesDataService,// needed by gcs-classes-data.service
    private schdatasvc: GcsSchAvailableDataService,
    private userdatasvc: MdlUserDataService,
  ) {
  }

  loadCodeLists(coldefs: columnSchema[]): Observable<any> {
    // create a list of requests for each code list found in coldefs
    coldefs.forEach(col => {
      // each column (if not already loaded)
      if (col.sellist) {
        this.queueCodeListRef(col.sellist);
      }
    });

    // this will get all the code lists in one call and then from the result array, build the code list and lookup dictionary for each one
    return this.getQueuedCodeLists();
  }

  queueCodeListRef(sellist: string): boolean {
    let ar = sellist.split('_');
    // if bad name or already in list, bail
    if (ar.length < 2 || this.codelists[sellist]) {
      return false;
    }

    // check if already in refarray
    let ispresent = false;
    this.refarray.every(ref => {
      if (ref.sellist === sellist) {
        // already in refarray
        ispresent = true;
        return false;
      }
      return true;
    });

    if (ispresent) {
      return false;
    }

    let i = this.mdlreqs.length;
    let req = null;
    // add to list
    if (ar[0] === 'tbl') {
      switch (ar[1]) {
        case 'program':
          req = this.pgmdatasvc.buildcodelistreq(i);
          this.refarray.push({ sellist: sellist, svc: this.pgmdatasvc });// for adding returned lists to codelists
          break;
        case 'scholarship':
          req = this.schdatasvc.buildcodelistreq(i);
          this.refarray.push({ sellist: sellist, svc: this.schdatasvc });// for adding returned lists to codelists
          break;
        case 'student':
          req = this.studatasvc.buildcodelistreq(i);
          this.refarray.push({ sellist: sellist, svc: this.studatasvc });// for adding returned lists to codelists
          break;
        case 'user':
          req = this.userdatasvc.buildcodelistreq(i);
          this.refarray.push({ sellist: sellist, svc: this.userdatasvc });// for adding returned lists to codelists
          break;
        case 'course':
          req = this.crsdatasvc.buildcodelistreq(i);
          this.refarray.push({ sellist: sellist, svc: this.crsdatasvc });// for adding returned lists to codelists
          break;
        case 'instructor':
          req = this.userdatasvc.buildcodelistreq(i, 'users_get_instructors');
          this.refarray.push({ sellist: sellist, svc: this.userdatasvc });// for adding returned lists to codelists
          break;
        default:
          break;
      }
    } else if (ar[0] === 'codeset') {
      req = this.codetbldatasvc.buildcodelistreq(i, { codeset: sellist.substring(8) });
      this.refarray.push({ sellist: sellist, svc: this.codetbldatasvc });// for adding returned lists to codelists
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

            // add to codelists
            let ref = this.refarray[i];
            this.addCodeList(ref.sellist, list, ref.svc);
          }
          return ret;// stop if error
        });
        this.mdlreqs = [];
        this.refarray = [];
      }
      return ret;
    }));
  }

  // build a code list and lookup dictionary
  addCodeList(sellist: string, list: any[], svc: any) {
    // in codelists, build a codeset: object for each select= column.  It contains 2 sub-items:
    // list: the codeset list from moodle
    // lookup: a dictionary object with each code populated with its description as the value.
    let a: any = {};
    this.codelists[sellist] = a;// save off, keyed on list code

    let codelist: any[] = [];
    a.list = codelist;
    let lookup: any = {};
    a.lookup = lookup;

    // copy to new list and populate a code dictionary for quick description lookups
    list.forEach(rec => {
      let r: any = {};
      if (svc.buildKey) {
        r.code = svc.buildKey(rec);
      } else {
        r.code = rec.code
      }
      if (svc.buildKey) {
        r.description = svc.buildDesc(rec);
      } else {
        r.description = rec.description;
      }
      codelist.push(r);// add each record to the code list

      lookup[r.code] = r.description;// add each record to the code list keyed on code
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
  getSelVal(selkey: string, code: string) {
    let a = this.codelists[selkey];
    if (a && a.lookup && a.lookup[code]) {
      return a.lookup[code.toString().toUpperCase()];
    }
    return '';
  }
}
