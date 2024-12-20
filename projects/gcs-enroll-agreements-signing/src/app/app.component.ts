import { Component, ViewChild } from '@angular/core';
import { GcsStudentDataService } from 'services/gcs-student-data.service';
import { GcsClassesTakenDataService } from 'services/gcs-classes-taken-data.service';
import { FormControl } from '@angular/forms';
import { Observable, map, startWith } from 'rxjs';
import { GcsDataService } from 'services/gcs-data.service';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { hasBackdrop: true } }
  ]
})
export class AppComponent {
  showDropDown = false;// dropdown visibility
  showContent = false;// content visibility
  showAgreements = false;// build the agreements
  banner: any;
  ctlist: any[] = [];// template list
  @ViewChild('listSelCtl') listSelCtl: any;

  // dropdown properties (set listSel.show=false if you don't want a dropdown)
  listSel = {
    show: true,// create in DOM
    disabled: false,
    fullList: new Array<any>,
    displayList: new Observable<any[]>,// shown in dropdown and dynamically filtered by what is typed in the filter ctl
    selected: '',// default dropdown selection
    filt: {
      show: true,
      ctl: new FormControl(),// filtering dropdown control
      doit: (val: any) => {
        return this.listSel.fullList.filter(item =>
          item.description.toLowerCase().includes(val.toLowerCase())
        );
      }
    },// filter object
    widthpx: '300',// dropdown width
    placeholder: 'Student',// dropdown label
  };

  constructor(
    private gcsdatasvc: GcsDataService,
    private studatasvc: GcsStudentDataService,
    private classestakendatasvc: GcsClassesTakenDataService,
  ) {
  }

  // initialization
  ngOnInit() {
    // show busy banner
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');

    // get the list of students with unsigned agreements (service will only return the logged-in person's record because they're only allowed to see their own info)
    this.studatasvc.getlistunsignedenrollmentagreements().subscribe({
      // Admin - (0 or more records can be returned representing all unsigned agreements for the current term) display and load dropdown of these students 
      // Non-Admin - (always 1 record returned even if no unsigned agreements) dropdown is hidden but their unsigned agreements are displayed

      // success
      next: stulist => {
        this.showDropDown = true;// make the dropdown visible
        // when one record is returned, hide the dropdown and just show the unsigned agreements
        if (stulist.length === 1) {
          this.listSel.show = false;// remove the dropdown
          this.fillScreen(stulist[0].id);
          return;
        }

        // when 0 records are returned, show the empty dropdown and show a message that there are no unsigned agreements
        if (stulist.length === 0) {
          this.ctlist = [];// force the "no records" message to show
          this.showContent = true;// make the content visible
          bnr.close();
          return;
        }

        // populate the dropdown list
        stulist.forEach(sturec => {
          this.listSel.fullList.push({ code: this.studatasvc.buildKey(sturec), description: this.studatasvc.buildDesc(sturec) });
        });

        // and, set up the incremental search
        this.listSel.displayList = this.listSel.filt.ctl.valueChanges
          .pipe(
            startWith(''),
            map(str => this.listSel.filt.doit(str))
          );
      },

      // error
      error: (error: string) => {
        bnr.close();
        this.gcsdatasvc.showNotification(error, '');
      },

      // complete
      complete: () => {
        bnr.close();
        this.listSelCtl.open();// present an open dropdown
      }
    });
  }

  fillScreen(stuid: string) {
    this.showAgreements = false;// hide the agreements
    this.showContent = false;// hide the content
    this.ctlist = [];// reset

    // show busy banner and register failsafe close timer
    this.banner = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');

    // get the student record and all unsigned screen records
    this.studatasvc.getrecbyid(stuid).subscribe({
      // success
      next: stulist => {
        // allow only single record
        if (stulist.length === 1) {
          this.classestakendatasvc.getlistunsignedbystuid(stuid).subscribe({
            // success
            next: unsignedlist => {
              // init temp flags in the list
              unsignedlist.forEach(r => {
                r.elective = false;// model used for the checkbox
                r.manualpricing = false;// used to indicate the record was successfully updated
                // also note that comments has been replaced with the formatted agreement and agreementid has been set to the actual agreementid
              });
              this.ctlist = unsignedlist;
              this.showAgreements = true;// show the agreements
            },

            // error
            error: (error: string) => {
              this.gcsdatasvc.showNotification(error, '');
            },
          });
        }
      },

      // error
      error: (error: string) => {
        this.gcsdatasvc.showNotification(error, '');
      },
    });
  }

  onAgreementsLoaded() {
    this.banner?.close();// hide the busy banner
    this.showContent = true;// make the content visible
  }

  onAgreementsSaved() {
    this.ctlist = [];// force the "no records" message to show
    this.showAgreements = true;// show it
  }
}
