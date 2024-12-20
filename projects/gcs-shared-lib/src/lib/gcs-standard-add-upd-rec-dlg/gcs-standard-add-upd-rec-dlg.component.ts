/*
Standard Add/Update Record Dialog
- This dialog is used to add or update a record in a table.
- All control for rendering and validation is defined by the table data service.

Note that this will operate in one of two modes:
1. FldDef Configuration Mode when operating on a flddef record.  This differs in two ways:
  a. The record being operated on is a reference, not a copy and no Save button is presented.  This means all changes are collected by caller and saved together.
	b. The dialog does not allow activation of a config mode for a flddef record.  If you want to change the flddef record, you must do so manually in the db.
2. Standard Add/Update Mode for all other tables.
*/
import { Component, Inject, NgZone, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Observable, of, take } from 'rxjs';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsEnrollAgreementDialogComponent } from 'projects/gcs-shared-lib/src/lib/gcs-enroll-agreement-dialog/gcs-enroll-agreement-dialog.component';
import { GcsTableFieldDefService } from 'services/gcs-table-field-def.service';
import { GcsCodelistsCacheService } from 'services/gcs-codelists-cache.service';
import { GcsCodelistsDataService } from 'services/gcs-codelists-data.service';
import { GcsTableFieldDefsCacheService, fldDef } from 'services/gcs-table-field-defs-cache.service';
import { CdkDragEnd, CdkDragMove, CdkDragStart, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { GcsSettingsService } from 'services/gcs-settings.service';
import { GcsCodeDataService } from 'services/gcs-code-data.service';

export interface GcsStdAddUpdRecDlgDataIn {
  title: string;// dialog title
  rec: any;// record to add or update
  tbldatasvc: any;// pointer to the table data service
}

export interface GcsStdAddUpdRecDlgDataOut {
  isAdd: boolean;// add mode flag
  rec: any;// return changed record
  errmsg: string;// dialog error msg
}
interface cfgState {
  curr: {
    dlg: {
      title: string,
      width: string,
      height: string
    },
  },
  orig: {
    dlg: {
      title: string,
      width: string,
      height: string
    },
  },
  flddefs: fldDef[],// field config changes collection used by a dialog when config mode is activated (this is a copy of the flddefs used to display the data fields))
}
export interface Topping {
  name: string;
}
@Component({
  selector: 'lib-gcs-standard-add-upd-rec-dlg',
  templateUrl: './gcs-standard-add-upd-rec-dlg.component.html',
  styleUrls: ['./gcs-standard-add-upd-rec-dlg.component.css'],
})
export class GcsStandardAddUpdRecDlgComponent {
  isadmin = false;
  showcfgtools = false;// this will display configuration tools for each displayed field plus the dialog window config tools.
  showhiddenflds = false;
  isdragging = false;
  cfgdialogRef: MatDialogRef<GcsStandardAddUpdRecDlgComponent, any> | undefined;
  /*
  viewflddefs is used to display the dialog fields, containing only the visible fields.
  dbflddefs is a reference to the global flddefs cache used to restore original order and values upon cancel.  Also, importantly, retains the sequencing id order.
  */
  viewflddefs!: fldDef[];// tells the template what fields to display and how to validate them (angular iterates through this in the template--also see dlgDataOut.rec)
  dbflddefs!: fldDef[];// reference to the global flddefs array for the original order and to check for changes
  dlgDataOut: GcsStdAddUpdRecDlgDataOut = {
    errmsg: '',// when empty, success
    rec: {},// contains the model data fields used by the dialog template, directly modified by user.  Also returned to caller.
    isAdd: false,// add mode flag returned to caller
  };
  origrec: any;// original field data record for change checking

  // Configuration mode dialog properties
  codesettableidrec: any;// dialog configuration values for width, height, title.  This is a reference to the global cache.
  dlgflddef = false;// dialog flddef record mode, set on when operating on a flddef record
  /*
  when showcfgtools is turned on, cfg will be populated like below.
  curr and orig hold the dialof window properties.
  flddefs contains a copy of the db flddefs for the the table for the purpose of collecting all changes to all field configurations while in this mode.
  When a config properties icon is clicked for a field, the new dialog references its flddef record directly in this dataset.  All config changes are
  saved/canceled together.
  */
  cfg: cfgState = {
    curr: {
      dlg: {
        title: '',
        width: '500px',
        height: '500px'
      }
    },
    orig: {
      dlg: {
        title: '',
        width: '500px',
        height: '500px'
      }
    },
    flddefs: []
  };

  @ViewChild('autosize') autosize!: CdkTextareaAutosize;
  @ViewChildren(CdkDropList) dropsQuery!: QueryList<CdkDropList>;

  constructor(
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public dlgDataIn: GcsStdAddUpdRecDlgDataIn,
    private gcsdatasvc: GcsDataService,
    private flddefscachedatasvc: GcsTableFieldDefsCacheService,
    public flddefdatasvc: GcsTableFieldDefService,
    private codedatasvc: GcsCodeDataService,
    public codelistsdatasvc: GcsCodelistsDataService,
    public codelistscachesvc: GcsCodelistsCacheService,
    private settingsdatasvc: GcsSettingsService,
    private _ngZone: NgZone
  ) {
    if (this.dlgDataIn.rec && this.dlgDataIn.tbldatasvc) {
      this.dlgflddef = (this.dlgDataIn.tbldatasvc.tableid === 'flddef');// flddef record mode
      // modifying a flddef record:  operate on caller's record directly, no save button, no config mode
      if (this.dlgflddef) {
        this.dlgDataOut.rec = this.dlgDataIn.rec;// reference to the caller's record
        this.origrec = this.flddefscachedatasvc.flddefsets[this.dlgDataIn.rec.tableid].find(o => o.id === this.dlgDataIn.rec.id);
      } else {
        // all other tables operate as an insulated dialog where the record is copied and saved to the db
        this.dlgDataOut.rec = this.dlgDataIn.tbldatasvc.copyRec(this.dlgDataIn.rec, {});// make a copy of the record for the template
        this.origrec = this.dlgDataIn.rec;// make a copy of the record for change checking
      }

      this.dlgDataOut.isAdd = (dlgDataIn.rec.id === 0);// add mode flag
      this.dbflddefs = this.dlgDataIn.tbldatasvc.flddefs();// data field defs for our tableid - reference to the global flddefs array to know the original order and values
      this.reloadFldDefs()// copy, values not reference, into viewflddefs suitably modified for add/upd mode so the template will display correctly
    } else {
      this.dlgDataOut.errmsg = 'Invalid input data--contact IT';
    }
  }

  ngOnInit() {
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');

    // load settings to if admin
    this.settingsdatasvc.getrec().subscribe(rec => {
      if (rec) {
        this.isadmin = rec.menuadmin;
      }
    });

    // build dynamic dropdown lists defined in viewflddefs
    this.codelistsdatasvc.loadDependentCodeLists(this.flddefdatasvc.flddefs()).subscribe({
      // success
      next: () => {
        this.codesettableidrec = this.codelistscachesvc.getRec('codeset_tableid', this.dlgDataIn.tbldatasvc.tableid);// ref to config values for dialog itself, width,height,title
      },

      // error
      error: (error: string) => {
        bnr.close();
        this.gcsdatasvc.showNotification(error, '');
      },

      // complete
      complete: () => {
        bnr.close();
      }
    });

    // in case of an error in the constructor, close the dialog here where it's safe
    if (this.dlgDataOut.errmsg) {
      this.Close(this.dlgDataIn);// pass back the original unchanged record
    } else {
      this.dialogRef.disableClose = true;

      this.dialogRef.keydownEvents().subscribe(e => {
        if (e.key === "Escape") {
          this.confirmClose();
        }
      });

      this.dialogRef.backdropClick().subscribe(_ => {
        this.confirmClose();
      });
    }
  }

  ngAfterViewInit() {
    // Trigger the resize logic after the view is initialized
    this.autosize?.resizeToFitContent();
    // pre-validate only the standard validation to show required fields
    this.gcsdatasvc.stdValRec(this.viewflddefs, this.codelistscachesvc, this.dlgDataOut.rec);
  }

  onDragStarted(event: CdkDragStart<fldDef>) {
    this.isdragging = true;
    console.log('Drag started:', event.source.data.fieldname);
  }

  onDragMoved(event: CdkDragMove<fldDef>) {
    console.log('Drag moved:', event.source.data.fieldname);
  }

  onDragEnded(event: CdkDragEnd<fldDef>) {
    this.isdragging = false;
    console.log('Drag ended:', event.source.data.fieldname);
  }

  onDragEnter(event: any) {
    console.log('Drag enter:', event.item.data.fieldname);
  }

  onDragLeave(event: any) {
    console.log('Drag leave:', event.item.data.fieldname);
  }

  onDrop(event: any) {
    if (this.showcfgtools) {
      // array index is stored in the id value, e.g. 'drp_0'
      let t = event.previousContainer.id.split('_')[1];
      let f = event.container.id.split('_')[1];
      moveItemInArray(this.viewflddefs, t, f);
      console.log('Item dropped:', event.item.data.fieldname);
    }
  }

  onValChanged(rec: any, flddef: fldDef) {
    // table-specific event handler
    if (this.dlgDataIn.tbldatasvc.onValChanged) this.dlgDataIn.tbldatasvc.onValChanged(rec, flddef, this.viewflddefs);

    // always revalidate standard validation when a field value changes to indicate required fields, etc but don't show the popup message
    this.gcsdatasvc.stdValRec(this.viewflddefs, this.codelistscachesvc, this.dlgDataOut.rec);

    // intercept dialog size changes and dynamically adjust
    //  if (colkey === 'dlgwidth' || colkey === 'dlgheight') {
    //    let w = this.viewflddefs.find(f => f.fieldname === 'dlgwidth');
    //    let h = this.viewflddefs.find(f => f.fieldname === 'dlgheight');
    //    if (w && h) {
    //      this.dialogRef.updateSize(w + 'px', h + 'px');
    //    }
    //  }
  }

  onCancelClick(): void {
    this.confirmClose();
  }

  onSaveClick() {
    // only save if there are changes
    if (!this.recHasChange()) {
      this.Close(this.dlgDataIn);// Nothing to save, return the original record
      return;
    }

    // complete validation
    this.valRec().subscribe({
      next: (errmsg: string) => {
        if (errmsg) {
          this.gcsdatasvc.showNotification(errmsg, '', 4000);
          return;// leave the dialog open
        }

        // save to the db.  set up the observable add/upd operation
        let o: Observable<any> = (this.dlgDataOut.isAdd
          ? this.dlgDataIn.tbldatasvc.addrec(this.dlgDataOut.rec)// add rec
          : this.dlgDataIn.tbldatasvc.updrec(this.dlgDataOut.rec));// update rec

        const bnr = this.gcsdatasvc.showNotification('Saving...', 'Save');
        o.subscribe({
          next: () => {
            this.Close(this.dlgDataOut);// Close after update is complete, return the changed record
          },
          error: (error: string) => {
            bnr.close();
            alert(error);
          },
          complete: () => {
            bnr.close();
          }
        });
      },

      error: (error: string) => {
        alert(error);
      }
    });
  }

  onSaveConfigClick() {
    /*
    First, iterate through the viewflddefs (on-screen) array, collecting all changed records and queue them up for a batched db update.

    Because these fields may have been re-ordered with drag & drop, the tricky thing is to make sure any moved fields will be saved in that new
    position in the db.  The fields are initially laid out in id order as read from the db, but if rearranged, the viewflddefs array ids are no longer
    in the right sequence.  Since the id determines the order in the db (being its unique key), use the id from that position in the original list
    for each queued record update.  This will effectively move the record data around to the correct positions in the db record framework when saved.
      
    For example (the 1st column is the id or identity key dictating the db order.  The 2nd, 3rd, etc. are the record values):
    
    dbflddefs (as read from the db)
    1 AAA aaaaaaaa
    2 BBB bbbbbbbb
    3 CCC cccccccc
    4 DDD dddddddd

    viewflddefs (with DDD moved up into the 2nd position on-screen)
    1 AAA aaaaaaaa
    4 DDD dddddddd
    2 BBB bbbbbbbb
    3 CCC cccccccc

    Queued updates (with ids taken from corresponding positions 2, 3, 4 of the db framework)
    2 DDD dddddddd
    3 BBB bbbbbbbb
    4 CCC cccccccc

    When saved, the db will be:
    1 AAA aaaaaaaa
    2 DDD dddddddd
    3 BBB bbbbbbbb
    4 CCC cccccccc

    This honors the changed order of fields on-screen but re-sequences the id so when saved, they will be moved to the same position in the db framework.
    */
    let queue: any[] = [];
    for (let i = 0, f: fldDef; f = this.viewflddefs[i]; i++) {
      f.id = this.dbflddefs[i].id;//re-establish the correct id sequence to move the record's position in the db

      // now queue a record update for each changed record
      if (this.hasConfigChange(i)) {
        this.flddefdatasvc.queueupdrec(f, queue);// queue local_gcs_table_field_def_update update
      }
    }

    // also add to the queue any dialog window config updates (like window size and window title)
    const curr = this.cfg.curr.dlg;
    const orig = this.cfg.orig.dlg;
    if (curr.title !== orig.title || curr.height !== orig.height || curr.width !== orig.width) {
      let r = this.codedatasvc.copyRec(this.codesettableidrec.rec, {});// make a copy of code record to update
      r.description = JSON.stringify(this.cfg.curr);// set new value (this does not change the original value in the cache, that is done below)
      this.codelistsdatasvc.codetbldatasvc.queueupdrec(r, queue);// queue local_gcs_code_update update
    }

    // now execute the queue
    if (queue.length) {
      const bnr = this.gcsdatasvc.showNotification('Saving...', 'Save');
      this.gcsdatasvc.execqueue(queue).subscribe({
        next: (mdlarray) => {
          // process each returned list
          mdlarray.forEach((mdl, i) => {
            let updrec: any = mdl.data;
            this.gcsdatasvc.mdltojs(updrec, queue[i].flddefs);// cvt updrec to js

            // we also need to update the global cache

            // For config mode, there can be 2 types of update request results to process which determines which record type is returned:
            // 1. dialog window configuration updates where the methodname=local_gcs_code_update
            // 2. flddef record updates where the methodname=local_gcs_table_field_def_update

            if (queue[i].methodname === 'local_gcs_code_update') {
              // convert JSON description to object
              let dbvals = JSON.parse(updrec.description);

              // reset values in the dialog window config
              curr.title = dbvals.title;
              curr.width = dbvals.width;
              curr.height = dbvals.height;
              orig.title = curr.title;
              orig.width = curr.width;
              orig.height = curr.height;
              this.cfgDlgResize(0, 0);// resize dialog to new size

              // update the global cache record json value as well to match the updated db
              let r = this.codesettableidrec;// points to cache record
              r.description = updrec.description;// set new value
              r.rec.description = r.description;
            } else if (queue[i].methodname === 'local_gcs_table_field_def_update') {
              // update the dbflddefs array with the new values
              // find the record in the global cache
              let orig = this.flddefscachedatasvc.flddefsets[updrec.tableid].find(o => o.id === updrec.id);
              if (orig) {
                this.flddefdatasvc.copyRec(updrec, orig);// replace the global cache (dbflddefs) record values to match the db
              }
            }

            this.gcsdatasvc.showNotification('Configurations saved.', 'Save', 1500);
            this.showhiddenflds = false;
            this.showcfgtools = false;// exit config mode
            this.cfg.flddefs = [];// clear the cfg changes
            this.reloadFldDefs();// reload from global cache and refresh screen
            this.cfgdialogRef?.close(this.cfgdialogRef);
          });
        },
        complete: () => {
          bnr.close();
        }
      });
    } else {
      this.cfgdialogRef?.close(this.cfgdialogRef);
    }
  }

  textboxHint(flddef: fldDef) {
    return '(multi-line)' + (flddef.ishtml ? ' (html)' : '');
  }

  openConfigDialog(fld: fldDef) {
    if (fld) {
      let r = this.codelistscachesvc.getRec('codeset_tableid', this.flddefdatasvc.tableid);// dialog window configuration, like width and height
      if (r && r.rec) {
        let cfg = JSON.parse(r.rec.description);
        this.cfgdialogRef = this.dialog.open(GcsStandardAddUpdRecDlgComponent, {
          autoFocus: true,
          width: cfg.dlg.width,
          height: cfg.dlg.height,
          data: {
            title: cfg.dlg.title.replace('$tableid', this.dlgDataIn.tbldatasvc.tableid).replace('$colhdr', fld.colhdr),
            rec: fld,// record to edit (points to the flddef record in the cache)
            tbldatasvc: this.flddefdatasvc// give the dialog a reference to our table data service
          }
        });
      }
    }
  }

  configNewRow(fld: fldDef) {
    if (fld && fld.addisnewline === fld.updisnewline) {
      fld.addisnewline = !fld.addisnewline;
      fld.updisnewline = !fld.updisnewline;
      this.refreshScreen();// refresh screen with changes (we don't call reloadFldDefs here because it reloads the unsaved version which would wipe out changes)
    }
  }

  configShowHide(fld: fldDef) {
    if (fld && fld.addshow === fld.updshow) {
      this.showhiddenflds = true;
      let show = (fld.addshow === 'hide' ? 'show' : (fld.addshow === 'show' ? 'readonly' : 'hide'));
      fld.addshow = show;
      fld.updshow = show;
      this.refreshScreen();// refresh screen with changes (we don't call reloadFldDefs here because it reloads the unsaved version which would wipe out changes)
    }
  }

  cfgDlgResize(add2w: number, add2h: number) {
    // adjust either the width or the height of the dialog
    const dlg = this.cfg.curr.dlg;
    const w = parseInt(dlg.width) + add2w;
    const h = parseInt(dlg.height) + add2h;
    dlg.width = Math.min(Math.max(w, 550), window.screen.width - 40) + 'px';
    dlg.height = Math.min(Math.max(h, 400), window.screen.height - 40) + 'px';
    this.dialogRef.updateSize(dlg.width, dlg.height);
  }

  cfgTitle() {
    const dlg = this.cfg.curr.dlg;
    const title = prompt('Change the window title: ', dlg.title);
    if (title) {
      dlg.title = title;
      this.dlgDataIn.title = title;
    }
  }

  cfgFldStyle(fld: fldDef, i: number) {
    let style = {
      'background-color': this.hasConfigChange(i) ? (fld.show === 'show' ? 'lightgreen' : (fld.show === 'hide' ? 'darkseagreen' : 'palegreen')) : (fld.show === 'show' ? 'antiquewhite' : (fld.show === 'hide' ? 'white' : 'floralwhite'))
    };
    return style;
  }

  cfgBtnStyle() {
    return 'height:16px;cursor:pointer;border:none;padding:2px 0px 0px 2px;background-color:transparent;';
  }

  fldStyle(flddef: fldDef) {
    // set change flag (this call is important to all recHasChange() refs and relies on angular to call for all fields)
    flddef.haschanges = this.gcsdatasvc.hasChange(this.dlgDataOut.rec, this.origrec, flddef);
    let style = {
      'background-color': (flddef.haschanges ? 'lightgreen' : 'inherit')
    };
    return style;
  }

  valRec(): Observable<string> {
    return this.dlgDataIn.tbldatasvc.valRec(this.dlgDataOut.rec, this.viewflddefs);
  }

  recHasChange() {
    let yep = false;
    this.viewflddefs.every(f => {
      yep = f.haschanges;
      return !yep;// quit on first change found
    });
    return yep;
  }

  reloadFldDefs() {
    this.viewflddefs = this.dbflddefs.map(x => Object.assign({}, x));// make a copy of the global viewflddefs array (each entry is a copy, not a ref)
    this.refreshScreen();
  }

  private refreshScreen() {
    let isAdd = this.dlgDataOut.isAdd;
    // reflect changes to the dialog
    this.viewflddefs.forEach(f => {
      // hide buttons
      if (f.datatype === 'buttons') {
        f.show = 'hide';// always hide buttons
        f.isnewline = false;
        f.popupid = '';
        f.isrequired = false;
        f.sellistid = '';
        f.haschanges = false;
        f.errmsg = '';
      } else {
        // based on the add/upd mode, copy to the working properties
        if (isAdd) {
          f.show = f.addshow;
          f.isnewline = f.addisnewline;
          f.popupid = f.addpopupid;
          f.isrequired = f.addisrequired;
          f.sellistid = f.addsellistid;
        } else {
          f.show = f.updshow;
          f.isnewline = f.updisnewline;
          f.popupid = f.updpopupid;
          f.isrequired = f.updisrequired;
          f.sellistid = f.updsellistid;
        }
        f.haschanges = false;
        f.errmsg = '';
      }
      f.isvisible = (this.showhiddenflds || f.show !== 'hide');// reflect to screen whether or not the field is present
    });
  }

  // confirm cancel
  private confirmClose() {
    if (this.showcfgtools) {
      // config mode
      if (this.hasConfigChanges() && this.gcsdatasvc.saveConfirm()) {
        this.onSaveConfigClick();
      } else {
        // restore viewflddefs array
        this.reloadFldDefs();
        const curr = this.cfg.curr.dlg;
        const orig = this.cfg.orig.dlg;
        curr.title = orig.title;
        curr.width = orig.width;
        curr.height = orig.height;

        this.cfgDlgResize(0, 0);// revert dialog size on-screen
      }
      this.showcfgtools = false;// exit config mode but do not close dialog
      this.showhiddenflds = false;
      this.cfg.flddefs = [];// clear the cfg changes
      return;
    } else if (!this.dlgflddef && this.recHasChange()) {
      // normal mode
      if (this.gcsdatasvc.saveConfirm()) {
        this.onSaveClick();
      } else {
        this.Close(this.dlgDataIn);// return original record to caller
      }
    } else {
      this.Close(this.dlgDataIn);// return original record to caller
    }
  }

  setupConfigMode() {
    // config mode is activated
    if (this.showcfgtools) {
      /*
      cfg = {
        curr: {
          dlg: {
            title: 'Dialog Configuration',
            width: '550px',
            height: '400px'
          },
        },
        orig: {
          dlg: {
            title: 'Dialog Configuration',
            width: '550px',
            height: '400px'
          },
        },
        flddefs: [],// dialog field configuration changes collection used by a dialog when config mode is activated (not used by new instance of this dialog configuring a field)
      };
      */
      this.cfg.flddefs = this.dbflddefs.map(x => Object.assign({}, x));// copy global cache flddefs array
      const dlgconfig = this.codesettableidrec;// dialog window configuration, like width and height
      const r = JSON.parse(dlgconfig.rec.description);
      this.cfg.orig.dlg = r.dlg;
      const dlg = this.cfg.curr.dlg;
      dlg.title = r.dlg.title;
      dlg.width = r.dlg.width;
      dlg.height = r.dlg.height;
    } else {
      // config mode is deactivated
      this.cfg.flddefs = [];// clear the cfg changes
      this.showhiddenflds = false;
      if (this.hasConfigChanges() && this.gcsdatasvc.saveConfirm()) {
        this.onSaveConfigClick();
      } else {
        // restore viewflddefs array
        this.reloadFldDefs();
      }
    }
  }

  hasConfigChanges() {
    // changed dimentions?
    const curr = this.cfg.curr.dlg;
    const orig = this.cfg.orig.dlg;
    if (curr.width !== orig.width || curr.height !== orig.height || curr.title !== orig.title) {
      return true;
    }

    // changes in the viewflddefs array?
    for (let i = 0, f; f = this.viewflddefs[i]; i++) {
      if (this.hasConfigChange(i)) {
        return true;
      }
    }
    return false;
  }

  hasConfigChange(i: number) {
    // look for change in viewflddefs array item referenced by i
    let f: any = this.viewflddefs[i];
    let o: any = this.dbflddefs[i];

    for (let key in o) {// we only care about the properties in the original flddef
      if (f[key] !== o[key]) {
        return true;
      }
    }
    return false;
  }

  tooltip(fld: fldDef) {
    let t = fld.tooltip;
    if (fld.datatype === 'bool') return t;// booleans are obvious and need no explanation

    let o = this.dlgDataIn.rec[fld.fieldname];
    if (o == this.dlgDataOut.rec[fld.fieldname]) return t;// no change

    // show the old value
    t += '\nWas:\n';
    switch (fld.datatype) {
      case 'date':
        return t + (o ? o.toLocaleDateString() : '(none)');
      case 'dropdown':
        return t + (o ? this.codelistscachesvc.getSelVal(fld.sellistid, o) : '(none)');
      case 'int':
        return t + (o ? o : '(zero)');
    }
    return t + (o ? o : '(blank)');
  }

  Close(dlgret: any) {
    this.dialogRef.close(dlgret);// return record to caller
  }

  /*
  +---------------------------------
  | Supported link functions
  +---------------------------------*/

  // Signable Agreement Dialog (used only for the class taken dialog on the agreementid field)
  // |popup(enrollagreement)
  openEnrollAgreementDialog() {
    if (this.dlgDataOut.rec.id) {
      // open the EnrollAgreement view dialog
      const dialogRef = this.dialog.open(GcsEnrollAgreementDialogComponent, {
        autoFocus: true,
        width: '100%',
        height: '80%',
        data: {
          ctrec: this.dlgDataOut.rec
        }
      });
    }
  }

  triggerResize() {
    // Wait for changes to be applied, then trigger textarea resize.
    this._ngZone.onStable.pipe(take(1))
      .subscribe(() => this.autosize.resizeToFitContent(true));
  }
}