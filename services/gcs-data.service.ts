import { Injectable } from '@angular/core';
import { mdlServiceResponseRec } from 'interfaces/mdl-service-response-rec';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { NotificationBannerComponent } from 'projects/gcs-shared-lib/src/lib/notification-banner/notification-banner.component';
import { MatDialog } from '@angular/material/dialog';

export interface MdlReq {
  index: number,
  methodname: string,
  args: any
}

export interface MdlReqKeyed {
  key: string,
  request: MdlReq
}

/*
columnSchema is used to render the fields in the dialog, defining the properties, behavior and validation.
Each line represents a field like "fieldname moodletype //colhdr|... "

Its properties are parsed from the line string into columnSchema (in parseMoodleRecStr) as follows:
key = fieldname
type = moodletype

Then, following the // is a "|" separated list of designators, either one-word keywords, key=val pairs or operation() set.  The supported designators are:
(the colhdr is always the first one and has no designator, it is just the text to display in the column header)

Field type keywords:
bool (converts int to bool)
date (converts int to date)
text (converts string to text)

List Control keywords:
nolist (applies only to the record list)
nosort (apply only to the record list)

Dialog Control designators:
newline (moves field to a new line)
width= (display width of field in pixels) e.g. width=120px
show= (how control is shown, one of show, readonly, hide) e.g. show=hide
val() (CSV validation designators, one of required) e.g. val(required)
sel() (specifies a table to use to populate a select list) e.g. sel(tbl,program) or sel(codeset,term)
popup() (popup link identifier) e.g. popup(enrollagreement)

Now, bear in mind that a dialog can be for update or add and you may not want these to operate in the same way.  To accomplish this, specify the designators that are
unique to each mode in the respective add and upd designator like upd(xxx,xxx,xxx,...) or add(xxx,xxx,xxx,...).  Any designators specified outside of the add and upd
designators in the "|" list will apply to both modes.

The supported mode designators (these are dynamically parsed by coldefsForDialogMode when dialog is opened) are:
newline
show=
popup()

width=, val() and sel() will always apply to both modes.

For illustration:
agreementid int   //Enr Agr ID|nolist|newline|upd(show=readonly)|add(show=hide)|popup(enrollagreement)|width=130px

The above line is parsed into columnSchema as follows:
key: agreementid
type: int
colhdr: Enr Agr ID
islist: false
isnewline: true
add: show=hide,popup(enrollagreement)
upd: show=readonly,popup(enrollagreement)
widthval: 130
*/
export class columnSchema {
  public isnative: boolean = false;// Indicates the field is from the native table.  For example, the buttons column is added by the app and is not a native field.

  // properties common to all modes
  public key: string = '';// table record field name
  public dbtype: string = '';// db data type: int, string
  public type: string = '';// how to display: int, bool, date, text, select, popup, buttons
  public colhdr: string = '';// column header text
  public widthval: string = '120';// optional but for now, always treated as px
  public ishtml: boolean = false;// possible html tags embedded and needs to be escaped for moodle (optional, default false)
  public tooltip: string = '';// optional tooltip text

  // list-specific control properties
  public islist: boolean = true;// show in list (optional, default true)
  public issort: boolean = true;// sortable (optional, default true)

  // mode properties specific to the mode.  These are transferred from the original string definitions and the compile deferred until the dialog is opened.
  public add: string = '';// csv list of designators used for add mode (optional, default '').
  public upd: string = '';// csv list of designators used for upd mode (optional, default '').

  // derived properties generated by parseMoodleRecStr and common to all modes
  public sellist: string = '';// sel list for code lookups in table list (optional, default '')
  public isrequired: boolean = false;// true requires a value (optional, default true)

 /*
"working" set of properties initialized when the dialog is opened and solely for its transitive use.  these are derived from either
the add/upd property based on whether adding or updating the record. Breaking out these directives simplifes the template logic and
just requires a quick compile each time the dialog is opened to isolate the properties that are relevant to the mode.
*/
  public show: string = '';// how field is displayed: show, hide, readonly
  public isnewline: boolean = false;// start on new line?
  public popupid: string = '';// popup identifier defined in standard-dialog-add-upd-table.html (e.g. 'enrollagreement')
  public errmsg: string = '';// error message (set by validator)
  public haschanges: boolean = false;// indicates when field has changed (set by validator)
};

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
  getlist(func: string, parms: any, coldefs: columnSchema[]) {
    const post = this.fmtgcspost(func, parms);
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {}
    ).pipe(map(mdl => {
      // intercept exception
      if (this.exceptionHandler(mdl)) {
        return [];
      }
      let list: any[] = mdl[0].data;
      list.forEach(rec => {
        this.mdltojs(rec, coldefs);
      });
      return list;
    }));
  }

  // get multiple lists given a request array
  getlists(mdlreqs: { index: number, methodname: string, args: any }[]) {
    const post = this.fmtpostfromreqlist(mdlreqs);
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {});
  }

  // read specific record from server
  getrec(func: string, parms: any, coldefs: columnSchema[] = []) {
    const post = this.fmtgcspost(func, parms);
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {}).pipe(
      map(mdl => {
        // intercept exception
        if (this.exceptionHandler(mdl)) {
          return {};
        }
        return this.mdltojs(mdl[0].data, coldefs);
      }));
  }

  // update specific record
  updrec(func: string, rec: any, coldefs: columnSchema[]) {
    if (!rec || rec.id <= 0) return;// no id, no update
    return this.dbupdrec(func, rec, coldefs);
  }

  // add new record
  addrec(func: string, rec: any, coldefs: columnSchema[]) {
    if (!rec || rec.id > 0) return;// id must not be present
    return this.dbupdrec(func, rec, coldefs);
  }

  // add/upd the record on the server and return the resulting record (moodle service func determines whether add or upd)
  private dbupdrec(func: string, rec: any, coldefs: columnSchema[]) {
    let updrec = this.copyRec(coldefs, rec, {}); // new copy to insulate caller's rec from the jstomdl conversion
    this.jstomdl(updrec, coldefs); // convert fields for update

    const post = this.fmtgcspost(func, { rec: updrec });
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {}).pipe(map(mdl => {
      // intercept exception
      if (this.exceptionHandler(mdl)) {
        return {};
      }
      rec = this.mdltojs(mdl[0].data, coldefs);// cvt returned rec to js and update the caller's record
      this.showNotification('Record saved.', 'Save', 999);//one second
      return rec;// also return it
    }));
  }

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
  getmdllistby(func: string, parms: {}, coldefs: columnSchema[]) {
    const post = this.fmtmdlpost(func, parms);
    return this.http.post<Array<mdlServiceResponseRec<any>>>(post.url, post.body, {}
    ).pipe(map(mdl => {
      // intercept exception
      if (this.exceptionHandler(mdl)) {
        return [];
      }
      let list: any[] = mdl[0].data;
      list.forEach(rec => {
        this.mdltojs(rec, coldefs);
      });
      return list;
    }));
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
  | coldefs processing utilities
  +------------------------------
  */

  // format record for js
  private mdltojs(rec: any, coldefs: columnSchema[]) {
    // convert moodle to js
    coldefs.forEach(coldef => {
      switch (coldef.type) {
        // convert date fields
        case 'date': {
          if (typeof rec[coldef.key] === "number") {
            let dt = new Date(rec[coldef.key] * 1000);
            rec[coldef.key] = new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());// convert from unix timestamp to javascript date
          } else {
            rec[coldef.key] = null;
          }
          break;
        }
      }

      // check for html fields
      if (coldef.ishtml) {
        rec[coldef.key] = this.unescapeHtml(rec[coldef.key]);
      }
    });
    return rec;
  }
  // format record for moodle
  private jstomdl(rec: any, coldefs: columnSchema[]) {
    // convert js to moodle
    coldefs.forEach(coldef => {
      if (coldef.type === 'date') {
        if (rec[coldef.key] instanceof Date) {
          let dt = new Date(rec[coldef.key].toString().substr(0, 24) + 'Z');// adjust to UTC
          rec[coldef.key] = Math.floor(dt.getTime() / 1000);// convert from javascript date to unix timestamp
        }
      } else if (coldef.type === 'bool') {
        rec[coldef.key] = rec[coldef.key] ? 1 : 0;
      }

      // assure correct db data type
      if (coldef.dbtype === 'string') {
        if (rec[coldef.key] !== null) {
          rec[coldef.key] = rec[coldef.key].toString();
        }
      } else if (coldef.dbtype === 'int') {
        rec[coldef.key] = parseInt(rec[coldef.key]);
      }

      // check for html fields
      if (coldef.ishtml) {
        rec[coldef.key] = this.escapeHtml(rec[coldef.key]);
      }
    });
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

  // generate displayed columns array for mat-table
  getDisplayedCols(coldefs: columnSchema[]): string[] {
    let displayedColumns: string[] = [];
    displayedColumns.length = 0;
    coldefs.forEach(a => {
      if (a.islist) {
        displayedColumns.push(a.key);
      }
    });
    return displayedColumns;
  }

  // generate a new columnSchema array from a moodle fields string (see specific table data service, e.g. gcs-program-data.service)
  parseMoodleRecStr(str: string): any[] {
    let coldefs: columnSchema[] = [];
    let lines: string[] = str.split("\n");
    lines.forEach(line => {
      if (line.trim().length > 0) {
        let item = new columnSchema();

        // split out comment
        let ar = line.split('//');
        if (ar.length === 2) {
          // field def parse out key & type
          let keytypear = ar[0].split(' ');
          // key & type
          if (keytypear.length >= 2) {
            item.key = keytypear[0];
            item.dbtype = keytypear[1];
            item.type = item.dbtype;// set default but may be changed below

            // split out partitioned comment items
            let commentar = ar[1].split('|');
            // key & type
            if (commentar.length > 0) {
              item.colhdr = commentar[0];
              // process designators...

              // Those compiled into columnSchema are:
              // nolist, nosort, bool, date, text, width=, sel(), val()

              // Those added to upd/add properties to be parsed into coldefsForDialogMode are:
              // newline, show=, popup()
              for (let i = 1, part: string; part = commentar[i]; i++) {
                part = part.trim().toLowerCase();
                switch (part) {
                  case 'nolist': {
                    item.islist = false;
                    break;
                  }
                  case 'nosort': {
                    item.issort = false;
                    break;
                  }
                  case 'bool': {
                    if (item.dbtype === 'int') {
                      item.type = 'bool';
                    }
                    break;
                  }
                  case 'date': {
                    if (item.dbtype === 'int') {
                      item.type = 'date';
                      item.widthval = '160';// date field dft is wider
                    }
                    break;
                  }
                  case 'text': {
                    if (item.dbtype === 'string') {
                      item.type = 'text';
                    }
                    break;
                  }
                  case 'html': {
                    if (item.dbtype === 'string') {
                      item.type = 'text';// handled in ui just like text.
                      item.ishtml = true;  // this designator is for fields that contain html tags where moodle needs it escaped(see mdltojs)
                    }
                    break;
                  }
                  case 'newline': {
                    item.add = this.commaSep(item.add, part);
                    item.upd = this.commaSep(item.upd, part);
                    break;
                  }

                  default: {// width=,sel(),val(),show=,popup(),upd(),add()
                    // width
                    if (part.indexOf('tooltip=') === 0) {
                      item.tooltip = part.substring(8);
                    } else      if (part.indexOf('width=') === 0) {// width
                        // ends with % or px
                        part = part.substring(6);
                        if (part.substring(part.length - 1) === '%') {
                          item.widthval = part.substring(0, part.length - 1);
                        } else if (part.substring(part.length - 2) === 'px') {
                          item.widthval = part.substring(0, part.length - 2);
                        }
                      } else if (part.indexOf('sel(') === 0) {
                      // this designates a dynamic select list and takes the form 'sel(sourcetype,source)
                      // source type - either 'codeset' or 'tbl'
                      // source - either a codeset name or a table designator name (see queueCodeListRef method in the gcs-code-data.service for the proper literal to use)
                      // e.g. sel(codeset,term) will populate the select with the term codeset from the codes table
                      // e.g. sel(tbl,program) will populate the select with the active programs in the programs table
                      // (when field is not required, a blank option is automatically added to the top)
                      let ar = part.substring(4, part.length - 1).split(',');// parse csv list within
                      if (ar.length === 2) {
                        item.type = 'select';
                        item.sellist = ar[0].trim() + '_' + ar[1].trim();// used to load the select list from the db
                      }
                    } else if (part.indexOf('val(') === 0) {
                      // this designates a validator list and takes the form 'val(validator,validator...)
                      // (only required supported)
                      let ar = part.substring(4, part.length - 1).split(',');// parse csv list within
                      for (let i = 0, val; val = ar[i]; i++) {
                        if (val === 'required') {
                          item.isrequired = true;
                        }
                      }
                    } else {
                      // either xxx() or xxx= but since either symbol can be present, determine which comes first when both are present
                      let eq = part.indexOf('=');// e.g. show=hide
                      let par = part.indexOf('(');// e.g. upd=(show=readonly,val(required),popup(enrollagreement))
                      if (par > 0 && eq > 0) {
                        // first one wins
                        if (par < eq) eq = -1; else par = -1;
                      }

                      // xxx(a,b,c) operation list
                      if (par > 0) {
                        let k = part.substring(0, par);// upd
                        let v = part.substring(par + 1, part.length - 1);// show=readonly,val(required),popup(enrollagreement)

                        if (k === 'add') {
                          item.add = this.commaSep(item.add, v);// add its instructions to the add property
                        } else if (k === 'upd') {
                          item.upd = this.commaSep(item.upd, v);// add its instructions to the upd property
                        } else {
                          // any other operation set like popup() is added to both
                          item.add = this.commaSep(item.add, part);
                          item.upd = this.commaSep(item.upd, part);
                        }
                      } else if (eq > 0) {
                        // key=val keywords
                        // any other is added to both mode lists
                        item.add = this.commaSep(item.add, part);
                        item.upd = this.commaSep(item.upd, part);
                      }
                    }
                    break;
                  }
                }
              }

              if (!item.islist) {
                item.issort = false;
              }
            }
            item.isnative = true;// this is a native field object
            coldefs.push(item);
          }
        }
      }
    });
    return coldefs;
  }

  // comma separate 2 strings when both are present
  private commaSep(a: string, b: string): string {
    if (a.length > 0 && b.length > 0) {
      return a + ',' + b;
    }
    return a + b;
  }

  // this function is called dynamically when our standardized add/upd dialog is opened.  It parses the add or upd definition to set the coldefs used by the dialog template
  coldefsForDialogMode(isAdd: boolean, coldefs: columnSchema[]) {
    // init transitive properties of coldefs for add or update mode
    coldefs.forEach(coldef => {
      coldef.show = 'show';// will contain only one of show, hide, readonly
      coldef.isnewline = false;
      coldef.popupid = '';
      coldef.haschanges = false;
      coldef.errmsg = '';

      // based on the add/upd mode, modify the coldef for the mode
      if (coldef.type === 'buttons') {
        coldef.show = 'hide';// always hide buttons
      } else {
        // use the appropriate property for the mode
        let vals = (isAdd ? coldef.add : coldef.upd).split(',');
        // process list
        for (let i = 0, val; val = vals[i]; i++) {
          val = val.trim();
          if (val === 'newline') {
            coldef.isnewline = true;
          } else if (val.indexOf('show=') === 0) {
            coldef.show = val.substring(5);
          } else if (val.indexOf('popup(') === 0) {
            // this designates a supported dialog link
            // popupid - identifies the popup to use (see standard-dialog-add-upd-table.html for the proper literal to use)
            // (e.g. popup(enrollagreement)

            // get contents
            coldef.popupid = val.substring(6, val.length - 1);// indicate which popup to use
          }
        }
      }
    });
    return coldefs;
  }

  // generate and initialize a new rec object
  initRec(coldefs: columnSchema[]): any {
    let rec: any = {};

    coldefs.forEach(a => {
      // only initialize native fields
      if (a.isnative) {
        switch (a.type) {
          case 'int': {
            rec[a.key] = 0;
            break;
          }
          case 'double': {
            rec[a.key] = 0;
            break;
          }
          case 'bool': {
            rec[a.key] = false;
            break;
          }
          case 'date': {
            rec[a.key] = null;
            break;
          }
          default: {
            rec[a.key] = '';
            break;
          }
        }
      }
    });
    return rec;
  }

  // fill method
  copyRec(coldefs: columnSchema[], fromrec: any, torec: any) {
    // using our columnSchema array, copy the values from the input record to the output record
    coldefs.forEach(coldef => {
      // skip non-table fields
      if (coldef.isnative) {
        torec[coldef.key] = fromrec[coldef.key];// copy the value
      }
    });
    return torec;
  }

  // Check if the record has changed
  hasChanges(coldefs: any[], rec: any, origrec: any): boolean {
    if (!coldefs || !rec || !origrec) return true;

    let chg = false;
    // using our columnSchema array, compare each value
    for (let i = 0, coldef; coldef = coldefs[i]; i++) {
      if (coldef.type === 'date') {
        let o = origrec[coldef.key];
        let n = rec[coldef.key];
        if (!o) {
          coldef.haschanges = n;
        } else if (!n) {
          coldef.haschanges = o;
        } else if (o instanceof Date && n instanceof Date) {
          coldef.haschanges = o.getTime() !== n.getTime();
        } else {
          coldef.haschanges = true;
        }
      } else {
        coldef.haschanges = origrec[coldef.key] !== rec[coldef.key];
      }
      if (coldef.haschanges) {
        chg = true;// changed
      }
    }
    return chg;;
  }

  // validate from coldefs directives
  valRec(coldefs: columnSchema[], codelistsdatasvc: any, rec: any): boolean {
    let isvalid: boolean = true;
    coldefs.forEach(a => {
      a.errmsg = '';// clear any previous error messages

      // val required
      if (a.isrequired) {
        if (!rec[a.key]) {
          a.errmsg = 'Required';
          isvalid = false;
        } else if (a.sellist) {
          // val those with a select list
          if (!codelistsdatasvc.getSelVal(a.sellist, rec[a.key])) {
            a.errmsg = 'Invalid value';
            isvalid = false;
          }
        }
      }
    });
    return isvalid;
  }

  /*
  +------------------------------
  | general utilities
  +------------------------------
  */

  saveConfirm() {
    return confirm('Do you want to save your changes first?\n\nOK - Save and Exit\nCancel - Exit & lose all changes');
  }

  showNotification(msg: string, icon: string='', wait: number = 20000) {
    return this.dialog.open(NotificationBannerComponent, {
      data: {message: msg, icon: icon, wait: wait },
    });
  }
}
