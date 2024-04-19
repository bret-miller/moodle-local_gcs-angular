/*
Standard Add/Update Record Dialog
- This dialog is used to add or update a record in a table.
- All control for rendering and validation is defined by the table data service.
*/
import { Component, Inject, NgZone, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Observable, take } from 'rxjs';

import { GcsDataService, columnSchema } from 'services/gcs-data.service';
import { GcsEnrollAgreementDialogComponent } from 'projects/gcs-shared-lib/src/lib/gcs-enroll-agreement-dialog/gcs-enroll-agreement-dialog.component';

export interface GcsStdAddUpdRecDlgDataIn {
  title: string;// dialog title
  rec: any;// record to add or update
  tbldatasvc: any;// pointer to the table data service
}

export interface GcsStdAddUpdRecDlgDataOut {
  isAdd: boolean;// add mode flag
  rec: any;// return changed record
  errmsg: string;// dialog title
}

@Component({
  selector: 'lib-gcs-standard-add-upd-rec-dlg',
  templateUrl: './gcs-standard-add-upd-rec-dlg.component.html',
  styleUrls: ['./gcs-standard-add-upd-rec-dlg.component.css'],
})
export class GcsStandardAddUpdRecDlgComponent {
  coldefs: columnSchema[] | undefined;// defines how to display and validate the record
  dlgDataOut: GcsStdAddUpdRecDlgDataOut = {
    errmsg: '',// when empty, success
    rec: {},// dialog template will modify this and return it
    isAdd: false,// add mode flag returned to caller
  };

  @ViewChild('autosize') autosize!: CdkTextareaAutosize;

  constructor(
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public dlgDataIn: GcsStdAddUpdRecDlgDataIn,
    private gcsdatasvc: GcsDataService,
    private _ngZone: NgZone
  ) {
    if (this.dlgDataIn.rec && this.dlgDataIn.tbldatasvc) {
      this.dlgDataOut.rec = this.dlgDataIn.tbldatasvc.copyRec(this.dlgDataIn.rec, {});// make a copy of the record for the template
      this.dlgDataOut.isAdd = (dlgDataIn.rec.id === 0);
      this.coldefs = this.dlgDataIn.tbldatasvc.coldefsForDialogMode(this.dlgDataOut.isAdd);// modify local coldefs for add or update
    } else {
      this.dlgDataOut.errmsg = 'Invalid input data--contact IT';
    }
  }

  ngOnInit() {
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

  // required for standard dialog html (leave empty if not needed)
  onSelChanged(rec: any, colkey: string) {
    this.valRec();
  }

  onCancelClick(): void {
    this.confirmClose();
  }

  onSaveClick(): void {
    // only save if there are changes
    if (this.hasChanges()) {
      // validate
      if (!this.valRec()) {
        this.gcsdatasvc.showNotification('Please correct the indicated fields.','', 999);
        return;
      }

      // set up the observable add/upd operation
      let o: Observable<any> | undefined;
      if (this.dlgDataOut.isAdd) {
        // add rec
        o = this.dlgDataIn.tbldatasvc.addrec(this.dlgDataOut.rec);
      } else {
        o = this.dlgDataIn.tbldatasvc.updrec(this.dlgDataOut.rec);
      }

      if (o) {
        const bnr = this.gcsdatasvc.showNotification('Saving...', 'Save');
        o.subscribe(
          () => {
            this.Close();// Close after update complete
          }, (error) => {
            console.error('Error:', error);
          }, () => {
            bnr.close();
          }
        );
      }
    } else {
      this.Close();// Cancel/ESC pressed/Nothing to save
    }
  }

  valRec() {
    return this.dlgDataIn.tbldatasvc.valRec(this.dlgDataOut.rec, this.coldefs);
  }

  hasChanges() {
    return this.dlgDataIn.tbldatasvc.hasChanges(this.dlgDataOut.rec, this.dlgDataIn.rec, this.coldefs);
  }

  // confirm close dialog
  private confirmClose() {
    if (this.hasChanges() && this.gcsdatasvc.saveConfirm()) {
      this.onSaveClick();
      return;
    }
    this.Close();
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

  triggerResize() {
    // Wait for changes to be applied, then trigger textarea resize.
    this._ngZone.onStable.pipe(take(1))
      .subscribe(() => this.autosize.resizeToFitContent(true));
  }
}
