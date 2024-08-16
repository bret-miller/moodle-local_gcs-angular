/*
Standard Add/Update Record Dialog
- This dialog is used to add or update a record in a table.
- All control for rendering and validation is defined by the table data service.

Note that this will operate in one of two modes:
1. FldDef Configuration Mode when operating on a flddef record.  This differs in two ways:
  a. The record is not saved to the db here, but copied back to the caller's record to be saved/canceled later.
	b. The dialog does not allow activation of a config mode for a flddef record.  If you want to change the flddef record, you must do so manually in the db.
2. Standard Add/Update Mode for all other tables.
*/
import { Component, Inject, NgZone, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Observable, take } from 'rxjs';

import { GcsDataService } from 'services/gcs-data.service';
import { GcsEnrollAgreementDialogComponent } from 'projects/gcs-shared-lib/src/lib/gcs-enroll-agreement-dialog/gcs-enroll-agreement-dialog.component';
import { GcsTableFieldDefService } from 'services/gcs-table-field-def.service';
import { GcsCodelistsDataService } from 'services/gcs-codelists-data.service';
import { GcsTableFieldDefsCacheService, fldDef } from 'services/gcs-table-field-defs-cache.service';
import { CdkDragEnd, CdkDragMove, CdkDragStart, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { GcsSettingsService } from 'services/gcs-settings.service';

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
export interface Topping {
  name: string;
}
@Component({
  selector: 'lib-gcs-standard-add-upd-rec-dlg',
  templateUrl: './gcs-standard-add-upd-rec-dlg.component.html',
  styleUrls: ['./gcs-standard-add-upd-rec-dlg.component.css'],
})
export class GcsStandardAddUpdRecDlgComponent {
  /**
flddefs is used to display the dialog fields, containing only the visible fields.
flddefsorig is a reference to the global flddefs cache used to restore original order and values upon cancel.  Also, importantly, retains the sequencing id order.
*/
  flddefs!: fldDef[];// defines the field properties used to display and validate the record
  flddefsorig!: fldDef[];// reference to the global flddefs array used to know the original order and values
  dlgconfig!: any;// dialog configuration
  dlgDataOut: GcsStdAddUpdRecDlgDataOut = {
    errmsg: '',// when empty, success
    rec: {},// dialog template will modify this and return it
    isAdd: false,// add mode flag returned to caller
  };
  isadmin = false;
  configmode = false;
  showhiddenflds = false;
  isdragging = false;

  @ViewChild('autosize') autosize!: CdkTextareaAutosize;
  @ViewChildren(CdkDropList) dropsQuery!: QueryList<CdkDropList>;

  constructor(
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public dlgDataIn: GcsStdAddUpdRecDlgDataIn,
    private gcsdatasvc: GcsDataService,
    private flddefscachedatasvc: GcsTableFieldDefsCacheService,
    public flddefdatasvc: GcsTableFieldDefService,
    public codelistsdatasvc: GcsCodelistsDataService,
    private settingsdatasvc: GcsSettingsService,
    private _ngZone: NgZone
  ) {
    if (this.dlgDataIn.rec && this.dlgDataIn.tbldatasvc) {
      this.dlgDataOut.rec = this.dlgDataIn.tbldatasvc.copyRec(this.dlgDataIn.rec, {});// make a copy of the record for the template
      this.dlgDataOut.isAdd = (dlgDataIn.rec.id === 0);
      this.dlgconfig = this.codelistsdatasvc.getRec('codeset_tableid', this.dlgDataIn.tbldatasvc.tableid);// dialog window configuration, like width and height
      this.flddefsorig = this.dlgDataIn.tbldatasvc.flddefs();// field configurations - reference to the global flddefs array to know the original order and values
      this.reloadFldDefs()// field configurations - get a new copy of the flddefs (displayed on-screen) modified for add/upd mode and field visibility
    } else {
      this.dlgDataOut.errmsg = 'Invalid input data--contact IT';
    }
  }

  ngOnInit() {
    // build dynamic select lists defined in flddefs
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');

    // load settings to if admin
    this.settingsdatasvc.getrec().subscribe(rec => {
      if (rec) {
        this.isadmin = rec.menuadmin;
      }
    });

    // build dynamic dropdown lists defined in flddefs
    this.codelistsdatasvc.loadDependentCodeLists(this.flddefdatasvc.flddefs()).subscribe({
      // error
      error: (error: any) => {
        console.error('Error:', error);
      },

      // complete
      complete: () => {
        bnr.close();
      }
    });

    // in case of an error in the constructor, close the dialog here where it's safe
    if (this.dlgDataOut.errmsg) {
      this.Close();
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
    this.valRec();
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
    if (this.configmode) {
      // array index is stored in the id value, e.g. 'drp_0'
      let t = event.previousContainer.id.split('_')[1];
      let f = event.container.id.split('_')[1];
      moveItemInArray(this.flddefs, t, f);
      console.log('Item dropped:', event.item.data.fieldname);
    }
  }

  onValChanged(rec: any, colkey: string) {
    // table-specific event handler
    if (this.dlgDataIn.tbldatasvc.onValChanged) this.dlgDataIn.tbldatasvc.onValChanged(rec, colkey, this.flddefs);

    this.valRec();// always revalidate when a field value changes

    // intercept dialog size changes and dynamically adjust
  //  if (colkey === 'dlgwidth' || colkey === 'dlgheight') {
  //    let w = this.flddefs.find(f => f.fieldname === 'dlgwidth');
  //    let h = this.flddefs.find(f => f.fieldname === 'dlgheight');
  //    if (w && h) {
  //      this.dialogRef.updateSize(w + 'px', h + 'px');
  //    }
  //  }
  }

  onCancelClick(): void {
    this.confirmClose();
  }

  onSaveClick(): void {
    // only save if there are changes
    if (this.hasChanges()) {
      // validate
      if (!this.valRec()) {
        this.gcsdatasvc.showNotification('Please correct the indicated fields.', '', 999);
        return;
      }

      // when saving a flddef record, we do not to save to the db here, instead copy back to the caller's record.
      if (this.dlgDataIn.tbldatasvc.tableid === 'flddef') {
        this.dlgDataOut.rec = this.dlgDataIn.tbldatasvc.copyRec(this.dlgDataOut.rec, this.dlgDataIn.rec);
        this.Close();
        return;
      }

      // all other tables save to the db.  set up the observable add/upd operation
      let o: Observable<any> | undefined;
      if (this.dlgDataOut.isAdd) {
        // add rec
        o = this.dlgDataIn.tbldatasvc.addrec(this.dlgDataOut.rec);
      } else {
        o = this.dlgDataIn.tbldatasvc.updrec(this.dlgDataOut.rec);
      }

      if (o) {
        const bnr = this.gcsdatasvc.showNotification('Saving...', 'Save');
        o.subscribe({
          next: () => {
            this.Close();// Close after update complete
          },
          error: (error) => {
            console.error('Error:', error);
          },
          complete: () => {
            bnr.close();
          }
        });
      }
    } else {
      this.Close();// Cancel/ESC pressed/Nothing to save
    }
  }

  onSaveConfigClick(): void {
    // queue up the field changes
    let queue: any[] = [];
    for (let i = 0, f: fldDef; f = this.flddefs[i]; i++) {
      // (tricky because the id determines the order in the dialog as well as in the db) iterate through the flddefs array (which may have been reordered
      // with drag and drop) but use the id from the unchanged list to retain the sequence.  This will effectively shift the record data in the db when saved.
      f.id = this.flddefsorig[i].id;//re-establish the original sequence id in fluid array

      // now update the db for each changed record
      if (this.hasConfigChange(i)) {
        this.flddefdatasvc.queueupdrec(f, queue);
      }
    }

    // queue up the dialog window config update
    let r = this.dlgconfig;
    if (r && r.rec && r.rec.description !== r.description) {
      this.codelistsdatasvc.codetbldatasvc.queueupdrec(r.rec, queue);// queue up the update
      r.rec.description = r.description;// set new "original" value in cache
    }

    // now execute the queue
    if (queue.length) {
      const bnr = this.gcsdatasvc.showNotification('Saving...', 'Save');
      this.gcsdatasvc.execqueue(queue)?.subscribe({
        next: (mdlarray) => {
          let ret = (!this.gcsdatasvc.exceptionHandler(mdlarray) && Array.isArray(mdlarray));
          if (ret) {
            // process each returned list
            mdlarray.every((mdl, i) => {
              ret = !this.gcsdatasvc.exceptionHandler(mdl);
              if (ret) {
                let flddef: any = mdl.data;
                this.gcsdatasvc.mdltojs(flddef, queue[i].flddefs);// cvt rec to js

                // update the flddefsorig array with the new values
                if (queue[i].methodname === 'local_gcs_table_field_def_update') {
                  // find the record in the global cache
                  let orig = this.flddefsorig.find(o => o.id === flddef.id);
                  this.flddefdatasvc.copyRec(flddef, orig);// replace the global cache (flddefsorig) record values to match the db
                }
              }
              return ret;// stop if error
            });

            if (ret) {
              this.gcsdatasvc.showNotification('Configurations saved.', 'Save', 999);//one second
              this.showhiddenflds = false;
              this.configmode = false;// exit config mode
              this.reloadFldDefs();// reload from global cache and refresh screen
            }
          }
          return ret;
        },
        error: (error) => {
          console.error('Error:', error);
        },
        complete: () => {
          bnr.close();
        }
      });
    } else {
      this.Close();
    }
  }

  textboxHint(flddef: fldDef) {
    return '(multi-line)' + (flddef.ishtml ? ' (html)' : '');
  }

  openConfigDialog(fld: fldDef) {
    if (fld) {
      let r = this.codelistsdatasvc.getRec('codeset_tableid', this.flddefdatasvc.tableid);// dialog window configuration, like width and height
      if (r && r.rec) {
        let cfg = JSON.parse(r.rec.description);
        let dialogRef = this.dialog.open(GcsStandardAddUpdRecDlgComponent, {
          autoFocus: true,
          width: cfg.dlg.width,
          height: cfg.dlg.height,
          data: {
            title: cfg.dlg.title.replace('$tableid', this.dlgDataIn.tbldatasvc.tableid).replace('$colhdr', fld.colhdr),
            rec: fld,// record to edit (points to the flddef record in the cache)
            tbldatasvc: this.flddefdatasvc// give the dialog a reference to our table data service
          }
        });

        // post-close processing
        dialogRef.afterClosed().subscribe(result => {
          if (result.errmsg) {
            alert(result.errmsg);
          } else {
            this.refreshScreen();// refresh screen with changes (we don't call reloadFldDefs here because it reloads the unsaved version which would wipe out changes)
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
    let r = this.dlgconfig;
    if (r && r.rec) {
      let cfg = JSON.parse(r.rec.description);
      let w = parseInt(cfg.dlg.width) + add2w;
      let h = parseInt(cfg.dlg.height) + add2h;
      cfg.dlg.width = Math.min(Math.max(w, 550), window.screen.width - 40) + 'px';
      cfg.dlg.height = Math.min(Math.max(h, 400), window.screen.height - 40) + 'px';
      this.dialogRef.updateSize(cfg.dlg.width, cfg.dlg.height);
      r.rec.description = JSON.stringify(cfg);// put back
    }
  }

  cfgTitle() {
    let r = this.dlgconfig;
    if (r && r.rec) {
      let cfg = JSON.parse(r.rec.description);
      let title = prompt('Change the window title: ', cfg.dlg.title);
      if (title) {
        cfg.dlg.title = title;
        r.rec.description = JSON.stringify(cfg);// put back
        this.dlgDataIn.title = title;
      }
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

  valRec() {
    return this.dlgDataIn.tbldatasvc.valRec(this.dlgDataOut.rec, this.flddefs);
  }

  hasChanges() {
    return this.dlgDataIn.tbldatasvc.hasChanges(this.dlgDataOut.rec, this.dlgDataIn.rec, this.flddefs);
  }

  reloadFldDefs() {
    this.flddefs = this.flddefsorig.map(x => Object.assign({}, x));// make a copy of the global flddefs array (each entry is a copy, not a ref)
    this.refreshScreen();
  }

  private refreshScreen() {
    let isAdd = this.dlgDataOut.isAdd;
    // reflect changes to the dialog
    this.flddefs.forEach(f => {
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
    // config mode
    if (this.configmode) {
      if (this.hasConfigChanges() && this.gcsdatasvc.saveConfirm()) {
        this.onSaveConfigClick();
      } else {
        // restore flddefs array
        this.reloadFldDefs();
        this.dlgconfig.rec.description = this.dlgconfig.description;// restore the original value
        this.cfgDlgResize(0, 0);// revert dialog size on-screen
      }
      this.configmode = false;// exit config mode but do not close dialog
      this.showhiddenflds = false;
      return;
    } else if (this.hasChanges()) {
      // normal mode
      if (this.gcsdatasvc.saveConfirm()) {
        this.onSaveClick();
      }
    }
    this.Close();
  }

  setupConfigMode() {
      // config mode is activated
    if (!this.configmode) {
      this.showhiddenflds = false;
      if (this.hasConfigChanges() && this.gcsdatasvc.saveConfirm()) {
        this.onSaveConfigClick();
      } else {
        // restore flddefs array
        this.reloadFldDefs();
      }
    }
  }

  hasConfigChanges() {
    // changed dimentions?
    let r = this.dlgconfig;
    if (r && r.rec && r.rec.description !== r.description) {
			return true;
		}
    // changes in the flddefs array?
    for (let i = 0, f; f = this.flddefs[i]; i++) {
      if (this.hasConfigChange(i)) {
        return true;
      }
    }
    return false;
  }

  hasConfigChange(i: number) {
    // look for change in flddefs array item referenced by i
    let f: any = this.flddefs[i];
    let o: any = this.flddefsorig[i];

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
        return t + (o ? this.codelistsdatasvc.getSelVal(fld.sellistid, o) : '(none)');
      case 'int':
        return t + (o ? o : '(zero)');
    }
    return t + (o ? o : '(blank)');
  }

  private Close() {
    this.dialogRef.close(this.dlgDataOut);// return the changed record
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