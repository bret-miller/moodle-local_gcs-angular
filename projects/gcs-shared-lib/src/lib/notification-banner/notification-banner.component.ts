import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'lib-notification-banner',
  standalone: true,
  imports: [],
  templateUrl: './notification-banner.component.html',
  styleUrl: './notification-banner.component.css'
})
export class NotificationBannerComponent {
  constructor(
    public dialogRef: MatDialogRef<NotificationBannerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string, icon: string, wait: number }
  ) {
  }

  ngOnInit() {
    // Automatically close the dialog after 5 seconds
    setTimeout(() => {
      this.dialogRef.close();
    }, this.data.wait);
  }
}
