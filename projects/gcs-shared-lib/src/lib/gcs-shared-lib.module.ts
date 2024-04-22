import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'modules/material-module';
import { GcsEnrollAgreementSignComponent } from './gcs-enroll-agreement-sign/gcs-enroll-agreement-sign.component';
import { GcsEnrollAgreementDialogComponent } from './gcs-enroll-agreement-dialog/gcs-enroll-agreement-dialog.component';
import { GcsStandardAddUpdRecDlgComponent } from './gcs-standard-add-upd-rec-dlg/gcs-standard-add-upd-rec-dlg.component';

@NgModule({
  declarations: [
    GcsEnrollAgreementSignComponent,
    GcsEnrollAgreementDialogComponent,
    GcsStandardAddUpdRecDlgComponent,
  ],
  imports: [
    FormsModule,
    MaterialModule,
    CommonModule,
  ],
  exports: [
    GcsEnrollAgreementSignComponent,
    GcsEnrollAgreementDialogComponent,
    GcsStandardAddUpdRecDlgComponent,
  ]
})
export class GcsSharedLibModule { }
