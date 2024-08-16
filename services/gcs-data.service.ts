import { Injectable } from '@angular/core';
import { mdlServiceResponseRec } from 'interfaces/mdl-service-response-rec';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { NotificationBannerComponent } from 'projects/gcs-shared-lib/src/lib/notification-banner/notification-banner.component';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { fldDef } from './gcs-table-field-defs-cache.service';

export interface MdlReq {
  index: number,
  methodname: string,
  args: any
}

export interface MdlReqKeyed {
  key: string,
  request: MdlReq
}

@Injectable({
  providedIn: 'root'
})
export class GcsDataService {
  public sesskey!: string;
  private svccall!: string;

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
  ) {
    // @ts-ignore
    this.sesskey = M.cfg.sesskey;
    // @ts-ignore
    this.svccall = M.cfg.wwwroot + '/lib/ajax/service.php';
  }

  /*
  +----------------------------------------------
  | GCS moodle service calls and utilities
  +----------------------------------------------
  (note that the property names used in params below must match the corresponding property, name defined in its /home/gcswww/dev.gcs.edu/local/gcs/classes/external/ def in its execute_parameters() function).
  */

  // get list
  getlist(func: string, parms: any, flddefs: fldDef[]) {
    const post = this.fmtgcspost(func, parms);
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {}).pipe(
      map(mdl => {
        // intercept exception
        if (this.exceptionHandler(mdl)) {
          throwError('moodle error');
        }
        let list: any[] = mdl[0].data;
        list.forEach(rec => {
          this.mdltojs(rec, flddefs);
        });
        return list;
      }),
      catchError(err => {
        return throwError(err.message || 'server error.');
      })
    );
  }

  // get multiple lists given a request array
  getlists(mdlreqs: { index: number, methodname: string, args: any }[]) {
    const post = this.fmtpostfromreqlist(mdlreqs);
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {});
  }

  // read specific record from server
  getrec(func: string, parms: any, flddefs: fldDef[]) {
    const post = this.fmtgcspost(func, parms);
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {}).pipe(
      map(mdl => {
        // intercept exception
        if (this.exceptionHandler(mdl)) {
          throwError('moodle error');
        }
        return this.mdltojs(mdl[0].data, flddefs);
      }),
      catchError(err => {
        return throwError(err.message || 'server error.');
      })
    );
  }

  // update specific record
  updrec(func: string, rec: any, flddefs: fldDef[]) {
    if (!rec || rec.id <= 0) return;// no id, no update
    return this.dbupdrec(func, rec, flddefs);
  }

  // add new record
  addrec(func: string, rec: any, flddefs: fldDef[]) {
    if (!rec || rec.id > 0) return;// id must not be present
    return this.dbupdrec(func, rec, flddefs);
  }

  private dbupdrec(func: string, rec: any, flddefs: fldDef[]): Observable<any> {
    const updrec = this.jstomdl(rec, flddefs); // convert fields for update
    if (Object.keys(updrec).length === 0) return updrec;

    const post = this.fmtgcspost(func, { rec: updrec });
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {}).pipe(map(mdl => {
      // intercept exception
      if (this.exceptionHandler(mdl)) {
        return {};
      }
      rec = this.mdltojs(mdl[0].data, flddefs);// cvt returned rec to js and update the caller's record
      this.showNotification('Record saved.', 'Save', 999);//one second
      return rec;// also return it
    }));
  }

  // update specific record
  queueupdrec(func: string, rec: any, flddefs: fldDef[], queue: any[]): boolean {
    if (!rec || rec.id <= 0) return false;// no id, no update
    return this.queuedbupdrec(func, rec, flddefs, queue);
  }

  // add new record
  queueaddrec(func: string, rec: any, flddefs: fldDef[], queue: any[]): boolean {
    if (!rec || rec.id > 0) return false;// id must not be present
    return this.queuedbupdrec(func, rec, flddefs, queue);
  }

  private queuedbupdrec(func: string, rec: any, flddefs: fldDef[], queue: any[]): boolean {
    const updrec = this.jstomdl(rec, flddefs); // convert fields for update
    if (Object.keys(updrec).length === 0) return false;

    // add the request info to the queue
    let req: any = {};
    req.methodname = 'local_gcs_' + func;
    req.args = { rec: updrec };
    req.flddefs = flddefs;
    queue.push(req);
    return true;
  }

  execqueue(queue: any[]) {
    // the returned observable will send all of the db requests in queue in one call and then process the returned array

    // format the csv string for the info parameter
    let mdlreqs: { index: number, methodname: string, args: any }[] = [];
    let csv = '';
    queue.forEach(req => {
      mdlreqs.push({ index: mdlreqs.length, methodname: req.methodname, args: req.args });
      csv += req.methodname + ',';
    });
    csv = csv.substring(0, csv.length - 1);

    const post= {
      url: this.svccall + '?info=' + csv + '&sesskey=' + this.sesskey,
      body: JSON.stringify(mdlreqs)
    };

    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {});
  }

  // add/upd the record on the server and return the resulting record (moodle service func determines whether add or upd)
  //private dbupdrec(func: string, rec: any, flddefs: Observable<fldDef[]>): Observable<any> {
  //  let updrec = this.copyRec(flddefs, rec, this.initRec(flddefs)); // new copy to insulate caller's rec from the jstomdl conversion
  //  this.jstomdl(updrec, flddefs); // convert fields for update

  //  const post = this.fmtgcspost(func, { rec: updrec });
  //  return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {}).pipe(map(mdl => {
  //    // intercept exception
  //    if (this.exceptionHandler(mdl)) {
  //      return {};
  //    }
  //    rec = this.mdltojs(mdl[0].data, flddefs);// cvt returned rec to js and update the caller's record
  //    this.showNotification('Record saved.', 'Save', 999);//one second
  //    return rec;// also return it
  //  }));
  //}

  // delete record (no checking is done here to prevent deleting a record used in another table.  this should be done by caller)
  delrec(func: string, rec: any) {
    if (!rec || rec.id <= 0) return;

    const id = rec.id;
    const post = this.fmtgcspost(func, { id });
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {});
  }

  exceptionHandler(mdl: any): boolean {
    if (!mdl) {
      alert('Unknown error.');
      return true;
    }
    if (Array.isArray(mdl)) {
      // process array
      for (let i = 0, rec: mdlServiceResponseRec<any>; rec = mdl[i]; i++) {
        if (this.checkException(rec)) {
          return true;
        }
      }
    } else if (this.checkException(mdl)) {
      return true;
    }
    return false;
  }

  private checkException(mdl: any): boolean {
    if (typeof mdl.error === 'string') {
      alert(mdl.error);
      return true;
    }
    if (typeof mdl.error === 'boolean' && mdl.error) {
      alert(mdl.exception.message + '\n\n' + mdl.exception.debuginfo + '\n\n' + mdl.exception.backtrace);
      return true;
    }
    return false;
  }

  // generate the http post components for a moodle service call
  private fmtgcspost(func: string, mdlargs: any) {
    const methodname: string = 'local_gcs_' + func;
    return {
      url: this.svccall + '?info=' + methodname + '&sesskey=' + this.sesskey,
      body: JSON.stringify([{ index: 0, methodname: methodname, args: mdlargs }])
    };
  }

  // generate the moodle service call request object
  fmtgcsreq(i: number, func: string, mdlargs: {}) {
    return { index: i, methodname: 'local_gcs_' + func, args: mdlargs };
  }

  // generate the http post components for a moodle service call
  private fmtmdlpost(methodname: string, mdlargs: {}) {
    return {
      url: this.svccall + '?info=' + methodname + '&sesskey=' + this.sesskey,
      body: JSON.stringify([{ index: 0, methodname: methodname, args: mdlargs }])
    };
  }

  // generate the http post components for a moodle service call
  private fmtpostfromreqlist(mdlreqs: { index: number, methodname: string, args: any }[]) {
    let csv = '';
    mdlreqs.forEach(req => {
      csv += req.methodname + ',';
    });
    csv = csv.substring(0, csv.length - 1);

    return {
      url: this.svccall + '?info=' + csv + '&sesskey=' + this.sesskey,
      body: JSON.stringify(mdlreqs)
    };
  }

  /*
  +------------------------------
  | Native moodle service calls
  +------------------------------*/
  // get list
  getmdllistby(func: string, parms: {}, flddefs: fldDef[]) {
    const post = this.fmtmdlpost(func, parms);
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {}).pipe(
      map(mdl => {
        // intercept exception
        if (this.exceptionHandler(mdl)) {
          return [];
        }
        const list: any[] = mdl[0].data;
        list.forEach(rec => {
          this.mdltojs(rec, flddefs);
        });
        return list;
      }),
      catchError(err => {
        return throwError(err.message || 'server error.');
      })
    );
  }

  /*
public void getUsersByField(String token, String domainName, String functionName, String restFormat, String field, String value) {
    try {
        String serverUrl = domainName + "/webservice/rest/server.php" + "?wstoken=" + token + "&wsfunction=" + functionName;
        HttpClient client = HttpClientBuilder.create().build();
        HttpPost post = new HttpPost(serverUrl);
        post.setHeader("Content-Type", "application/x-www-form-urlencoded");
        List<NameValuePair> urlParameters = new ArrayList<>();
        urlParameters.add(new BasicNameValuePair("field", field));
        urlParameters.add(new BasicNameValuePair("values[0]", value));
        post.setEntity(new UrlEncodedFormEntity(urlParameters));
        HttpResponse response = client.execute(post);
        BufferedReader rd = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
        String line;
        while ((line = rd.readLine()) != null) {
            System.out.println(line);
        }
    } catch (IOException e) {
        e.printStackTrace();
    }
}
  */

  // get moodle user by field
  //getUsersByField(field:string, value:string):any {
  //  const url = this.domainName + "/webservice/rest/server.php?wstoken=" + this.sesskey + "&wsfunction=" + 'core_user_get_users_by_field';
  //  const headers = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
  //  const body = new URLSearchParams();
  //  body.set(field, 'id');
  //  body.set('values[0]', value);

  //  return this.http.post(url, body.toString(), { headers }).pipe(map(response => {
  //    return response;
  //  }));
  //}

  /*
  +------------------------------
  | flddefs processing utilities
  +------------------------------
  */

  // modify record for js
  mdltojs(rec: any, flddefs: fldDef[]): any {
    // convert moodle to js
    flddefs.forEach(flddef => {
      const fldName = flddef.fieldname;
      const fldVal = rec[fldName];

      switch (flddef.datatype) {
        // convert date fields
        case 'date':
          if (fldVal !== 0 && typeof fldVal === 'number') {
            const date = new Date(fldVal * 1000);
            rec[fldName] = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());// convert from unix timestamp to javascript date
          } else {
            rec[fldName] = null;
          }
          break;

        default:
          // check for html fields
          if (flddef.ishtml) {
            rec[fldName] = this.unescapeHtml(fldVal);
          }
          break;
      }
    });
    return rec;
  }

  // format record for moodle
  private jstomdl(input: any, flddefs: fldDef[]): any {
    const output: any = {};

    // convert js to moodle
    flddefs.forEach(flddef => {
      const fldName = flddef.fieldname;
      let fldVal = input[fldName];

      switch (flddef.dbdatatype) {
        case 'int':
          // int moodle type can be int, date, bool
          if (fldVal) {
            if (flddef.datatype === 'date' && fldVal instanceof Date) {
              const date = new Date(fldVal.toString().substr(0, 24) + 'Z');
              fldVal = Math.floor(date.getTime() / 1000);
            } else if (flddef.datatype === 'bool') {
              fldVal = fldVal ? 1 : 0;
            } else if (/^\d+$/.test(fldVal)) {
              fldVal = parseInt(fldVal);
            }
          } else {
            fldVal = 0;
					}
          break;

        case 'string':
          // string moodle type can be text, html
          if (fldVal) {
            fldVal = flddef.ishtml ? this.escapeHtml(fldVal) : fldVal.toString();
          } else {
            fldVal = '';
					}
          break;

        case 'double':
          if (!(typeof fldVal === 'number' && Number.isFinite(fldVal))) {
            fldVal = 0;
          }
          break;
      }
      output[fldName] = fldVal;
    });

    return output;
  }

  escapeHtml(html: string) {
    const escapeMap: any = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return html.replace(/[&<>"']/g, (char) => escapeMap[char]);
  }

  unescapeHtml(html: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  }

  // comma separated 2 strings when both are present
  commaSep(a: string, b: string): string {
    return a && b ? a + ',' + b : a + b;
  }

  // generate and initialize a new rec object (from array object)
  initRec(flddefs: fldDef[]): any {
    const rec: any = {};

    for (const flddef of flddefs) {
      switch (flddef.datatype) {
        case 'int':
        case 'double':
          rec[flddef.fieldname] = 0;
          break;
        case 'bool':
          rec[flddef.fieldname] = false;
          break;
        case 'date':
          rec[flddef.fieldname] = null;
          break;
        default:
          rec[flddef.fieldname] = '';
          break;
      }
    }

    return rec;
  }

  // fill method
  copyRec(flddefs: fldDef[], irec: any, orec: any) {
    // using caller's fldDef array, copy the values from the input record to the output record
    flddefs.forEach(flddef => {
      orec[flddef.fieldname] = irec[flddef.fieldname];// copy the value
    });
    return orec;
  }

  // Check if the record has changed
  hasChanges(flddefs: fldDef[], rec: any, origrec: any): boolean {
    if (!flddefs || !rec || !origrec) return true;

    let chg = false;
    // using our fldDef array, compare each value (all must be checked because we track each field to show the user what has changed)
    for (const flddef of flddefs) {
      if (flddef.datatype === 'date') {
        const origDate = origrec[flddef.fieldname];
        const newDate = rec[flddef.fieldname];

        if (origDate instanceof Date && newDate instanceof Date) {
          flddef.haschanges = origDate.getTime() !== newDate.getTime();
        } else {
          flddef.haschanges = origDate !== newDate;
        }
      } else {
        flddef.haschanges = origrec[flddef.fieldname] !== rec[flddef.fieldname];
      }

      if (flddef.haschanges) {
        chg = true;// function return value
      }
    }
    return chg;;
  }

  // validate from flddefs directives
  valRec(flddefs: fldDef[], codelistsdatasvc: any, rec: any): boolean {
    if (!flddefs || !rec) return false;

    for (const flddef of flddefs) {
      flddef.errmsg = ''; // Clear any previous error messages

      // Validate required fields
      if (flddef.isrequired) {
        const value = rec[flddef.fieldname];
        if (!value) {
          flddef.errmsg = 'Required';
          return false; // Return early if a required field is missing
        }

        // Validate dropdown list values
        if (flddef.sellistid && !codelistsdatasvc.getSelVal(flddef.sellistid, value)) {
          flddef.errmsg = 'Invalid value';
          return false; // Return early if an invalid value is found
        }
      }
    }

    return true; // All validations passed
  }

  /*
  +------------------------------
  | general utilities
  +------------------------------*/
  // For each select col, Sort and filter on description, not code
  setSelSortFilt(dataSource: MatTableDataSource<any>, flddefs: fldDef[], codelistsdatasvc: any) {
    // pre-select listed columns
    const cols = flddefs.filter(col => col.islist);

    // sort on the expanded description for columns defined with descriptions
    dataSource.sortingDataAccessor = (item, property) => {
      // make expanded description available for the search for listed columns
      for (const col of cols) {
        if (col.fieldname === property) {
          if (col.datatype === 'dropdown') {
            return codelistsdatasvc.getSelVal(col.addsellistid || col.updsellistid, item[property])
          }
          return item[property]
        }
      }
    };

    // filter on the expanded description for columns defined with descriptions
    dataSource.filterPredicate = (item, filter) => {
      let concat = '';
      for (const col of cols) {
        if (col.datatype === 'dropdown') {
          concat += codelistsdatasvc.getSelVal(col.addsellistid || col.updsellistid, item[col.fieldname]) + ' ';
        } else {
          concat += item[col.fieldname] + ' ';
        }
      }
      return concat.toLowerCase().includes(filter.toLowerCase())
    };
  }

  //
  saveConfirm() {
    return confirm('Do you want to save your changes first?\n\nOK - Save and Exit\nCancel - Exit & lose all changes');
  }

  showNotification(msg: string, icon: string = '', wait: number = 20000) {
    return this.dialog.open(NotificationBannerComponent, {
      data: { message: msg, icon: icon, wait: wait },
    });
  }
}