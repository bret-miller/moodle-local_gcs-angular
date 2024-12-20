/*
Use this component to display the enrollment agreement for the user to read and sign.
The dialogData.ctrec will be updated with the user's signature and the dialogData.ctrec will be returned to the caller when the dialog is closed.

e.g. this is how the dialog is called from the caller:

let dialogRef = this.dialog.open(GcsEnrollAgreementDialogComponent, {
  data: { ctrec: this.ctrec }
});
dialogRef.afterClosed().subscribe((result: any) => {
  if (result) {
    // do something with the result
  }
});
*/

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
@Component({
  selector: 'lib-gcs-enroll-agreement-dialog',
  templateUrl: './gcs-enroll-agreement-dialog.component.html',
  styleUrls: ['./gcs-enroll-agreement-dialog.component.css']
})
export class GcsEnrollAgreementDialogComponent {
  title: string = 'Enrollment Agreement';// dialog title
  ctlist: any[] = [];// one-record list for the template

  constructor(
    public dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any,
  ) {
    // one-record list needed by the template component (gcs-enroll-agreement-sign).  It can modify this record and the changes will be reflected in the dialogData.ctrec.
    this.ctlist.push(dialogData.ctrec);
  }

  // initialization (see template for the rendering of the agreement)
  ngOnInit() {
    this.dialogRef.disableClose = true;

    this.dialogRef.keydownEvents().subscribe(e => {
      if (e.key === "Escape") {
        this.dialogRef.close();
      }
    });

    this.dialogRef.backdropClick().subscribe(_ => {
      this.dialogRef.close();
    });
  }

  // close the dialog
  onSaved() {
    this.dialogRef.close();
  }
}
