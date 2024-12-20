import { APP_INITIALIZER, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from 'modules/material-module';
import { GcsTableFieldDefsCacheService } from 'services/gcs-table-field-defs-cache.service';
import { GcsEnrollAgreementSignComponent } from './gcs-enroll-agreement-sign/gcs-enroll-agreement-sign.component';
import { GcsEnrollAgreementDialogComponent } from './gcs-enroll-agreement-dialog/gcs-enroll-agreement-dialog.component';
import { GcsStandardAddUpdRecDlgComponent } from './gcs-standard-add-upd-rec-dlg/gcs-standard-add-upd-rec-dlg.component';
import { GcsClassesTakenComponent } from './gcs-classes-taken/gcs-classes-taken.component';
import { GcsClassesTakenDlgComponent } from './gcs-classes-taken-dlg/gcs-classes-taken-dlg.component';
import { GcsSchGivenComponent } from './gcs-sch-given/gcs-sch-given.component';
import { GcsSchGivenDlgComponent } from './gcs-sch-given-dlg/gcs-sch-given-dlg.component';
import { GcsProgramsCompletedComponent } from './gcs-programs-completed/gcs-programs-completed.component';
import { GcsProgramsCompletedDlgComponent } from './gcs-programs-completed-dlg/gcs-programs-completed-dlg.component';
import { GcsSchApplicationComponent } from './gcs-sch-application/gcs-sch-application.component';
import { GcsSchApplicationDlgComponent } from './gcs-sch-application-dlg/gcs-sch-application-dlg.component';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { catchError, of } from 'rxjs';

/*
+------------------------
| App Initialization
+------------------------*/
// (this function is auto-subscribed to during APP_INITIALIZATION and awaits the results so the field defs are available for the app)
export function libInitializer(flddefscachedtasvc: GcsTableFieldDefsCacheService) {
  return () =>
    flddefscachedtasvc.flddefsets$.pipe(
      // Handle errors to ensure the observable completes
      catchError(() => of())
    );
}

@NgModule({
  declarations: [
    GcsEnrollAgreementSignComponent,
    GcsEnrollAgreementDialogComponent,
    GcsClassesTakenComponent,
    GcsClassesTakenDlgComponent,
    GcsSchGivenComponent,
    GcsSchGivenDlgComponent,
    GcsProgramsCompletedComponent,
    GcsProgramsCompletedDlgComponent,
    GcsSchApplicationComponent,
    GcsSchApplicationDlgComponent,
    GcsStandardAddUpdRecDlgComponent,
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    CommonModule,
  ],
  exports: [
    GcsEnrollAgreementSignComponent,
    GcsEnrollAgreementDialogComponent,
    GcsClassesTakenComponent,
    GcsClassesTakenDlgComponent,
    GcsSchGivenComponent,
    GcsSchGivenDlgComponent,
    GcsProgramsCompletedComponent,
    GcsProgramsCompletedDlgComponent,
    GcsSchApplicationComponent,
    GcsSchApplicationDlgComponent,
    GcsStandardAddUpdRecDlgComponent,
  ],
  providers: [
    GcsTableFieldDefsCacheService,
    {
      provide: APP_INITIALIZER,
      useFactory: libInitializer,// function to subscribe to during app init
      deps: [GcsTableFieldDefsCacheService],// pre-load
      multi: true,
    },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' }
    }
  ],
})
export class GcsSharedLibModule { }
