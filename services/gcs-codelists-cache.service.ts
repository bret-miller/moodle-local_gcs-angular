import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GcsCodelistsCacheService {
  private codelists: any = {};// cached code lists used by selects or other code lookups

  constructor() { }

  hasList(sellist: string): boolean {
    let a = this.codelists[sellist];
    return (a && a.list);
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

  // select list filtered on a boolean filter function specified in its service class.  It decides inclusion using a data record
  getSelList(sellist: string, tbldatasvc: any = undefined, datarec: any = undefined) {
    let codelist;
    const ar = sellist.split('=');// split out any filter
    codelist = this.codelists[ar[0]];// just use the list name
    if (codelist && codelist.list) {
      return codelist.list.filter((listrec: any) => !tbldatasvc || !tbldatasvc.filtForDropdown || tbldatasvc.filtForDropdown(sellist, listrec, datarec));
    }
    return [];
  }

  // select list
  getSelVal(sellist: string, code: string): string {
    const ar = sellist.split('=');// split out any filter
    const r = this.getRec(ar[0], code);
    return r ? r.description : '';
  }

  // select list
  getRec(sellist: string, code: string): any {
    const ar = sellist.split('=');// split out any filter
    const a = this.codelists[ar[0]];
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
