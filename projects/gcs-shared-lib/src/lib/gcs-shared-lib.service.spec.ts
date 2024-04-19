import { TestBed } from '@angular/core/testing';

import { GcsSharedLibService } from './gcs-shared-lib.service';

describe('GcsSharedLibService', () => {
  let service: GcsSharedLibService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GcsSharedLibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
