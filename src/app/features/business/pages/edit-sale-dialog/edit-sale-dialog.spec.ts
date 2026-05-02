import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditSaleDialog } from './edit-sale-dialog';

describe('EditSaleDialog', () => {
  let component: EditSaleDialog;
  let fixture: ComponentFixture<EditSaleDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditSaleDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditSaleDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
