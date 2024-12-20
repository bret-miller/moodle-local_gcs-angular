/*
Use this component to display the classes taken given a student id.  It provides full list functionality, like add, edit, delete, and save.
Nothing is passed back to the caller.

e.g. this is how the dialog is called from the caller:

let dialogRef = this.dialog.open(GcsClassesTakenDlgComponent, {});
*/

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'lib-gcs-sch-application-dlg',
  templateUrl: './gcs-sch-application-dlg.component.html',
  styleUrl: './gcs-sch-application-dlg.component.css'
})
export class GcsSchApplicationDlgComponent {
  stuid: string = '';// the student id to pass to the component

  constructor(
    public dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any,
  ) {
    this.stuid = dialogData.stuid;
  }

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

  // close the dialog
  close() {
    this.dialogRef.close();
  }
}
