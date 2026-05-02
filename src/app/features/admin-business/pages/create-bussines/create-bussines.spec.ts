import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateBussines } from './create-bussines';

describe('CreateBussines', () => {
  let component: CreateBussines;
  let fixture: ComponentFixture<CreateBussines>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBussines]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateBussines);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
