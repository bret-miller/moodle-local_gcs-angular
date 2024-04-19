/*
- Passed in is a class taken record array to display enroll agreements for.  Only id is used for input and agreementid and agreementsigned are returned.
- The component will display the agreement text(s), a checkbox for each to sign, a print icon and a save button.  These are built-in and automatically functional.
- When the enrollment agreement has not been signed for a class taken record, the appropriate latest agreement text is automatically used.
- When the enrollment agreement has already been signed, it should generally not be un-signed.  Aa warning confirmation is popped up if this is attempted.
- Upon save, the agreementid and new agreementsigned timestamps are also set in the caller's array.
- A callback is made to the caller to indicate that the save has been made.

e.g. this is how the component is used in a template:
<lib-gcs-enroll-agreement-sign [class_taken_list]="class_taken_list" (onLoaded)="onAgreementsLoaded()" (onSaved)="onAgreementsSaved()"></lib-gcs-enroll-agreement-sign>
*/

import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { GcsClassesTakenDataService } from 'services/gcs-classes-taken-data.service';
import { GcsDataService } from 'services/gcs-data.service';
import { GcsSettingsService } from 'services/gcs-settings.service';

@Component({
  selector: 'lib-gcs-enroll-agreement-sign',
  templateUrl: './gcs-enroll-agreement-sign.component.html',
  styleUrls: ['./gcs-enroll-agreement-sign.component.css']
})
export class GcsEnrollAgreementSignComponent {
  @Input('class_taken_list') callerlist: any[] = [];// list of class taken records (passed by reference)
  @Output() onLoaded: EventEmitter<void> = new EventEmitter<void>();
  @Output() onSaved: EventEmitter<void> = new EventEmitter<void>();

  @ViewChild('PrintableEnrollAgreement') PrintableEnrollAgreement!: ElementRef;// printable snippet

  today: Date = new Date();
  ctlist: any[] = [];// template list
  logourl: string = '';
  submitmsg: string = '';
  todocnt: number = 99;

  constructor(
    private gcsdatasvc: GcsDataService,
    private classestakendatasvc: GcsClassesTakenDataService,
    private settingsdatasvc: GcsSettingsService,
  ) {
  }

  // initialization
  ngOnInit() {
    // onLoaded event progress countdown
    this.todocnt = this.callerlist.length * 2;

    if (this.callerlist.length <= 0) {
      this.checkItOff();// check it off
      return;
    }

    // since we modify the records for our own purposes, copy to a local list
    this.callerlist.forEach((callerrec: any) => {
      // read the class taken record to have a saveable record
      this.classestakendatasvc.getrecbyid(callerrec.id).subscribe(
        // success
        (dbrec: any) => {
          // make sure the caller's record reflects the current agreementid and agreementsigned
          callerrec.agreementid = dbrec.agreementid;
          callerrec.agreementsigned = dbrec.agreementsigned;

          let uirec = { ...dbrec };// copy the dbrec for the template
          this.ctlist.push(uirec);// add to template array

          // add the issigned property (reflected in the template checkbox)
          uirec.issigned = (uirec.agreementsigned);

          // get the agreement info (note that the agreementid is also returned which is important when it isn't yet signed because the service chooses the appopriate one)
          this.gcsdatasvc.getrec('classes_taken_agreement_info_get', { id: uirec.id }).subscribe(
            // success
            (earec: any) => {
              uirec.agreementid = earec.agreementid;// set the agreementid in the local uirec
              uirec.headertext = this.gcsdatasvc.unescapeHtml(earec.headertext);// tack on the header text
              uirec.agreementtext = this.gcsdatasvc.unescapeHtml(earec.agreementtext);// tack on the agreement text
            },

            // error
            (error) => {
              console.error('Error:', error);
            },

            // complete
            () => {
              this.checkItOff();// check it off
            }
          );
        },

        // error
        (error) => {
          console.error('Error:', error);
        },

        // complete
        () => {
          this.checkItOff();// check it off
        }
      );
    });

    // load settings to get logourl
    this.settingsdatasvc.getrec().subscribe(rec => {
      if (rec && rec.printlogoenabled) {
        this.logourl = rec.logourl;
      }
    });
  }

  // check it off and trigger onLoaded event
  private checkItOff() {
    if (--this.todocnt <= 0) {
      this.onLoaded.emit();
    }
  }

  // print the agreement
  PrintEnrollAgreement() {
    let body = this.PrintableEnrollAgreement.nativeElement.innerHTML;
    if (body) {
      // open a new window and write the head and body to it, print, then close the window
      let w = window.open('_blank');
      if (w) {
        // find the .gcsagreementtext class definition, parse the appended angular string encased in [] and remove all occurrences of it in the head
        let head = document.head.innerHTML;
        let s = head.indexOf('.gcsagreementtext');
        if (s > 0) {
          let b = head.indexOf('[', s);// find the first [ following the .gcsagreementtext
          if (b > s) {
            let e = head.indexOf(']', b);
            let xcl = '\\[' + head.substring(b + 1, e) + '\\]';// extract the string & escape the brackets;

            // replace all occurrences of xcl
            head = head.replace(new RegExp(xcl, 'g'), '');
          }
        }

        w.document.open();
        w.document.write(`
<html lang="en-us"><head>${head}</head>
  <body onload="window.print();window.close()">${body}</body>
</html>
`);
        w.document.close();
      }
    }
  }

  isSavable() {
    // check if all records have been signed
    let chkcnt = 0;
    for (let i = 0, r: any; r = this.ctlist[i]; i++) {
      if (r.issigned) {
        chkcnt++;
      }
    }
    this.submitmsg = (chkcnt === this.ctlist.length ? '(click to save)' : 'Please sign all agreements above (' + chkcnt + ' of ' + this.ctlist.length + ' signed)');
    return (chkcnt === this.ctlist.length);
  }

  Save() {
    if (this.isSavable()) {
      // save each record
      for (let i = 0, uirec: any; uirec = this.ctlist[i]; i++) {
        // in our ui array rec, the properties relevant to a save are:
        // issigned - contains the issigned flag bound to the checkbox
        // agreementid - contains the actual agreementid

        let callerrec: any = this.callerlist[i];// also get the original record for reference

        // do not allow the original signature to be overwritten
        if ((!callerrec.agreementsigned) || confirm('You are about to overwrite an existing signature.  Are you sure?')) {
          // set the agreement fields when the checkbox is checked
          if (uirec.issigned) {
            uirec.agreementsigned = this.today// newly signed
            // set in the caller's rec too
            callerrec.agreementid = uirec.agreementid;// set the agreementid in caller's rec
            callerrec.agreementsigned = uirec.agreementsigned// newly signed

            // update record
            this.classestakendatasvc.updrec(uirec)?.subscribe(rec => {
              // check for all records signed
              let allupdated = true;
              for (let i = 0, r: any; r = this.ctlist[i]; i++) {
                if (!r.agreementid) {
                  allupdated = false;
                  break;
                }
              }
              // once all records updated, show message and clear the list
              if (allupdated) {
                // ask if they want to print the agreements
                if (confirm('Thank you!  All agreements have been signed.  Would you like to print them?')) {
                  this.PrintEnrollAgreement();
                }
                this.ctlist = [];// clear the list
                // indicate saved
                this.onSaved.emit();
              }
            });
          }
        }
      }
    }
  }
}
