/*
Use this component to display the scholapplication.  It provides a selectable list with functionality like add, edit, delete.

For this mode, do not specify student-id so the complete list is displayed.  [student-id]= is used for pre-filtered dialog popups.
e.g. <lib-gcs-sch-application></lib-gcs-sch-application>

Nothing is passed back to the caller.

e.g. this is how the dialog is called from the caller:

let dialogRef = this.dialog.open(GcsClassesTakenDlgComponent, {});
*/
import { Component, Input, NgZone, ViewChild } from '@angular/core';
import { GcsStudentDataService } from 'services/gcs-student-data.service';
import { GcsCodelistsDataService } from 'services/gcs-codelists-data.service';
import { GcsClassesTakenDataService } from 'services/gcs-classes-taken-data.service';
import { GcsSchGivenDataService } from 'services/gcs-sch-given-data.service';
import { GcsSchAvailableDataService } from 'services/gcs-sch-available-data.service';
import { CoreUserDataService } from 'services/core-user-data.service';
import { FormControl } from '@angular/forms';
import { Observable, map, startWith } from 'rxjs';
import { GcsDataService } from 'services/gcs-data.service';
import { fldDef } from 'services/gcs-table-field-defs-cache.service';

@Component({
  selector: 'lib-gcs-sch-application',
  templateUrl: './gcs-sch-application.component.html',
  styleUrl: './gcs-sch-application.component.css'
})
export class GcsSchApplicationComponent {
  @Input('student-id') stuid: string = '';

  today: Date = new Date();
  showContent = false;
  sturec: any = {};
  stuschdefrec: any = {};
  schgivenrecorig: any = {};
  schgivenrec!: any;
  stuname: string = '';
  stuemail: string = '';
  isStuEligible: boolean = false;
  AcademicYear: number = 0;
  AcceptingApplications: boolean = false;
  firstcrsdt: Date = new Date();

  listFilterVal: string = '';// search list

  // dropdown properties (set listSel.show=false if you don't want a dropdown)
  @ViewChild('listSelCtl') listSelCtl: any;
  listSel = {
    show: true,
    disabled: false,
    visibility: 'hidden',
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
    private ngZone: NgZone,
    public studatasvc: GcsStudentDataService,
    public codelistsdatasvc: GcsCodelistsDataService,
    public classestakendatasvc: GcsClassesTakenDataService,
    public schgivendatasvc: GcsSchGivenDataService,
    public schavailabledatasvc: GcsSchAvailableDataService,
    public coreuserdatasvc: CoreUserDataService,
  ) {
    this.schgivenrec = schgivendatasvc.initRec();// init
    this.schgivenrecorig = this.schgivendatasvc.copyRec(this.schgivenrec, this.schgivenrecorig);// copy
  }

  // initialization
  ngAfterViewInit() {
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.AcademicYear = (this.today.getMonth() > 8 ? this.today.getFullYear() + 1 : this.today.getFullYear());

    // db request
    let flddefs: fldDef[] = [];// this app uses no flddefs
    this.codelistsdatasvc.loadDependentCodeLists(flddefs, 'tbl_program,codeset_pass_fail').subscribe({// queue and get the program and pass_fail codelists
      // success
      next: () => {
        // load student list
        this.studatasvc.getlist().subscribe({
          // success
          next: stulist => {
            // When stuid is present, select just that one
            if (this.stuid) {
              this.listSel.visibility = 'hidden';
              stulist.every(sturec => {
                if (sturec.id === this.stuid) {
                  this.listSel.fullList.push({ code: this.studatasvc.buildKey(sturec), description: this.studatasvc.buildDesc(sturec) });
                  return false;
                }
                return true;
              });
              this.listSel.show = (stulist.length === 0);// should be hidden when record is found
              this.fillScreen(this.stuid);
            } else {
              // admin automatically gets all student records, student only gets his/her own
              this.listSel.visibility = (stulist.length === 0 ? 'hidden' : 'visible');
              this.listSel.show = (stulist.length > 1);
              if (this.listSel.show) {
                stulist.forEach(sturec => {
                  this.listSel.fullList.push({ code: this.studatasvc.buildKey(sturec), description: this.studatasvc.buildDesc(sturec) });
                });
                // set up the incremental search
                this.listSel.displayList = this.listSel.filt.ctl.valueChanges
                  .pipe(
                    startWith(''),
                    map(str => this.listSel.filt.doit(str))
                  );
                this.listSelCtl.open();// present an open dropdown
              } else {
                // when student is logged in, only their record is returned
                this.fillScreen(stulist[0].id);
              }
            }
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
      },

      // error
      error: (error: string) => {
        bnr.close();
        this.gcsdatasvc.showNotification(error, '');
      },
    });
  }

  fillScreen(stuid: string) {
    this.showContent = false;

    // Perform all async operations before showing results
    const bnr = this.gcsdatasvc.showNotification('Loading...', 'Hourglass Top');
    this.ngZone.runOutsideAngular(() => {
      // pre-clear
      this.AcceptingApplications = false;
      this.isStuEligible = false;
      this.schgivenrec = this.schgivendatasvc.initRec();
      this.stuemail = '';
      this.stuname = '';

      // get the student record and all related scholarship screen records
      this.studatasvc.getrecbyid(stuid).subscribe(stulist => {
        // allow only single record
        if (stulist.length === 1) {
          let sturec = stulist[0];
          this.isStuEligible = this.isStuRcEligible(sturec);
          if (this.isStuEligible) {
            this.stuname = (sturec.legalfirstname.trimEnd() + ' ' + sturec.legalmiddlename).trimEnd() + ' ' + sturec.legallastname;
            this.sturec = sturec;

            // get the student's email address
            this.coreuserdatasvc.getrecbyid(sturec.userid).subscribe(userrec => {
              this.stuemail = userrec.email;

              // get the scholarship definition record
              this.schavailabledatasvc.getrecbycode(this.sturec.scholarshipeligible).subscribe(schdefrec => {
                if (schdefrec.id > 0) {
                  this.AcceptingApplications = (this.today >= schdefrec.applyfrom && this.today <= schdefrec.applythru);
                  this.stuschdefrec = schdefrec;

                  // read the scholarship record if it exists
                  this.schgivendatasvc.getrecbylogical(this.sturec.id, this.AcademicYear).subscribe(schgivenlist => {
                    if (schgivenlist.length === 1) {
                      this.schgivenrec = schgivenlist[0];
                      this.schgivenrecorig = this.schgivendatasvc.copyRec(this.schgivenrec, this.schgivenrecorig);// copy
                    }

                    // find the first class taken date
                    this.classestakendatasvc.getfilteredstulist(this.sturec.id).subscribe(list => {
                      list.forEach(rec => {
                        if (rec.registrationdate < this.firstcrsdt) {
                          this.firstcrsdt = rec.registrationdate;
                        }
                      });
                      // Now that all async operations are complete, give control to angular to update the UI
                      this.ngZone.run(() => {
                        bnr.close();
                        this.showContent = true;
                      });
                    });
                  });
                }
              });
            });
          } else {
            // give control to angular to update the UI
            this.ngZone.run(() => {
              bnr.close();
              this.showContent = true;
            });
          }
				} else {
          // give control to angular to update the UI
          this.ngZone.run(() => {
            bnr.close();
            this.showContent = true;
          });
				}
      });
    });
  }

  private isStuRcEligible(sturec: any): boolean {
    return (sturec && sturec.statuscode === 'ACT' && sturec.acceptancedate && sturec.scholarshipeligible && sturec.scholarshipeligible !== 'RST');
  }

  statusMsg(): string {
    // student not eligible
    if (!this.isStuEligible) {
      return 'You must be an eligible GCS student to apply for a scholarship.';
    }

    // not accepting applications
    if (!this.AcceptingApplications) {
      return 'GCS scholarship applications are no longer being accepted for the ' + this.AcademicYear + ' Academic Year.';
    }

    // has not applied
    if (!this.schgivenrec.termyear) {
      return '';
    }

    // Awaiting approval
    if (this.schgivenrec.decision) {
      return this.schgivenrec.decision + '.';
    }

    // applied and approved/denied
    return 'You will be notified when your GCS scholarship application has been reviewed by the registrar.';
  }

  ClearMsgs() {
  }

  Save() {
    // init scholarship rec
    let r: any = this.schgivenrec;
    if (!r.cadinfoauth) {
      alert('Please indicate your consent for GCS to verify your pastoral status with GCI Department of Church Administration and Development.');
      return;
    }
    r.studentid = this.sturec.id;
    r.termyear = this.AcademicYear;
    r.requestdate = this.today;
    r.programcode = this.sturec.programcode;
    r.perunitamount = this.stuschdefrec.perunitamount;
    r.coursemax = this.stuschdefrec.coursemax;
    r.eligiblefrom = new Date(this.today.getFullYear().toString() + '-01-01');
    r.eligiblethru = new Date((this.today.getFullYear() + this.stuschdefrec.eligibleyears - 1).toString() + '-12-31');
    r.category = this.stuschdefrec.scholarshipcode;

    // update record
    this.schgivendatasvc.addupdrec(this.schgivenrec, this.schgivenrecorig)?.subscribe((upd: any) => {
      if (upd.studentid) {
        this.fillScreen(this.schgivenrec.studentid);
      }
    });
  }
}
