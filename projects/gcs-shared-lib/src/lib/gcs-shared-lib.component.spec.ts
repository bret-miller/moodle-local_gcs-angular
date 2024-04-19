import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GcsSharedLibComponent } from './gcs-shared-lib.component';

describe('GcsSharedLibComponent', () => {
  let component: GcsSharedLibComponent;
  let fixture: ComponentFixture<GcsSharedLibComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GcsSharedLibComponent]
    });
    fixture = TestBed.createComponent(GcsSharedLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
