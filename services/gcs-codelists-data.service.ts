import { Injectable } from '@angular/core';
import { GcsCodeDataService } from './gcs-code-data.service';
import { GcsDataService } from './gcs-data.service';
import { GcsProgramDataService } from './gcs-program-data.service';
import { Observable, map } from 'rxjs';
import { GcsStudentDataService } from './gcs-student-data.service';
import { GcsCoursesDataService } from './gcs-courses-data.service';
import { GcsSchAvailableDataService } from './gcs-sch-available-data.service';
import { MdlUserDataService } from './mdl-user-data.service';
import { GcsTableFieldDefService } from './gcs-table-field-def.service';
import { GcsCodelistsCacheService } from './gcs-codelists-cache.service';
import { fldDef } from './gcs-table-field-defs-cache.service';
import { add } from 'lodash';
import { GcsClassesDataService } from './gcs-classes-data.service';

@Injectable({
  providedIn: 'root'
})
export class GcsCodelistsDataService {
  // class-level queue arrays.  queueCodeListRef adds to these arrays and getQueuedCodeLists processes them
  mdlreqs: { index: number, methodname: string, args: {} }[] = [];
  refqueue: any[] = [];// build our list of dropdowns keyed on unique code

  constructor(
    private gcsdatasvc: GcsDataService,
    public flddefdatasvc: GcsTableFieldDefService,
    public codetbldatasvc: GcsCodeDataService,
    private pgmdatasvc: GcsProgramDataService,
    private studatasvc: GcsStudentDataService,
    private clsdatasvc: GcsClassesDataService,
    public crsdatasvc: GcsCoursesDataService,// needed by gcs-classes-data.service
    private schdatasvc: GcsSchAvailableDataService,
    public codelistscachesvc: GcsCodelistsCacheService,
    private userdatasvc: MdlUserDataService,
  ) {
  }

  loadDependentCodeLists(flddefs: fldDef[], addtllistrefs: string = ''): Observable<void> {
    // add requests for each code list found in flddefs
    this.loadCodeListsFor(flddefs)// add requests for each code list found in flddefs
    let csvlist = addtllistrefs + (addtllistrefs.length === 0 ? '' : ',') + 'codeset_tableid';// always add codeset_tableid (needed for dialog config)
    this.queueCodeListRefs(csvlist);// add parm list request(s) plus tableids

    // this will get all the code lists in one call and then from the result array, build the code list and lookup dictionary for each one
    return this.getQueuedCodeLists();
  }

  private loadCodeListsFor(flddefs: fldDef[]): any {
    // create a list of requests for each code list found in flddefs
    flddefs.forEach(fld => {
      this.queueCodeListRef(fld.addsellistid);
      this.queueCodeListRef(fld.updsellistid);
    });
  }

  private queueCodeListRefs(sellistcsv: string) {
    // Split the CSV sellist names passed in
    const sellists = sellistcsv.split(',');

    // Queue each code list reference
    sellists.forEach(sellist => {
      this.queueCodeListRef(sellist);
    });
  }

  private queueCodeListRef(sellist: string) {
    // bail if empty
    if (!sellist) return;

    // parse out what comes before the first underscore and what comes after (do NOT use split because table name may contain '_')
    let i = sellist.indexOf('_');
    if (i < 0) return;

    const tbltype = sellist.substring(0, i);
    const tblname = sellist.substring(i + 1);

    // if bad name or already in list or already in refqueue, bail
    if (!tblname || this.codelistscachesvc.hasList(sellist) || this.refqueue.find(l => { l.sellist === sellist })) return;

    i = this.mdlreqs.length;
    let svc: any;
    let addtl: any;
    // add to list
    if (tbltype === 'tbl') {
      switch (tblname) {
        case 'program':
          svc = this.pgmdatasvc;
          break;
        case 'scholarship':
          svc = this.schdatasvc;
          break;
        case 'student':
          svc = this.studatasvc;
          break;
        case 'user':
          svc = this.userdatasvc;
          addtl = 'users_get_all';
          break;
        case 'class':
          svc = this.clsdatasvc;
          break;
        case 'course':
          svc = this.crsdatasvc;
          break;
        case 'instructor':
          svc= this.userdatasvc;
          addtl = 'users_get_instructors';
          break;
        default:
          return;
      }
    } else if (tbltype === 'codeset') {
      svc = this.codetbldatasvc;
      addtl = { codeset: tblname };
    }

    // add to request list
    if (svc) {
      this.refqueue.push({ sellist: sellist, svc: svc });// for adding returned lists to codelists
      this.mdlreqs.push(svc.buildcodelistreq(i, addtl));// for mdl call
    }
  }

  private getQueuedCodeLists(sellistcsv: string = ''): Observable<void> {
    // first queue any specified lists
    this.queueCodeListRefs(sellistcsv);

    // this will get all the code lists queued in mdlreqs in one call and then build the code list and lookup dictionary for each one
    return this.gcsdatasvc.getqueuedlists(this.mdlreqs).pipe(
      map(mdlarray => {
        // process each returned list
        mdlarray.forEach((mdl, i) => {
          const list: any[] = mdl.data;

          // add the codelist
          const ref = this.refqueue[i];
          this.codelistscachesvc.addCodeList(ref.sellist, list, ref.svc);
        });

        // Clear the request and reference queues
        this.mdlreqs = [];
        this.refqueue = [];
      })
    );
  }
}