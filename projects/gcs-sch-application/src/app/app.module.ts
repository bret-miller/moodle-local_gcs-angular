import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MaterialModule } from 'modules/material-module';
import { AppComponent } from './app.component';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { APP_INITIALIZER } from '@angular/core';
import { GcsTableFieldDefsCacheService } from 'services/gcs-table-field-defs-cache.service';
import { catchError, of } from 'rxjs';

/*
+------------------------
| App Initialization
+------------------------*/
// (this function is auto-subscribed to during APP_INITIALIZATION and awaits the results so the field defs are available for the app)
export function appInitializer(flddefscachedtasvc: GcsTableFieldDefsCacheService) {
  return () =>
    flddefscachedtasvc.flddefsets$.pipe(
      // Handle errors to ensure the observable completes
      catchError(() => of())
    );
}

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    MaterialModule,
    ReactiveFormsModule,
  ],
  providers: [
    GcsTableFieldDefsCacheService,
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,// function to subscribe to during app init
      deps: [GcsTableFieldDefsCacheService],// pre-load
      multi: true,
    },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } }],
  bootstrap: [AppComponent]
})
export class AppModule { }
