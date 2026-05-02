import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListBussines } from './list-bussines';

describe('ListBussines', () => {
  let component: ListBussines;
  let fixture: ComponentFixture<ListBussines>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListBussines]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListBussines);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
