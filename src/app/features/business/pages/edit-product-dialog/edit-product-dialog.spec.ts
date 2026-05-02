import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditProductDialog } from './edit-product-dialog';

describe('EditProductDialog', () => {
  let component: EditProductDialog;
  let fixture: ComponentFixture<EditProductDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditProductDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditProductDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
