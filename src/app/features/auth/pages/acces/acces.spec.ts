import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Acces } from './acces';

describe('Acces', () => {
  let component: Acces;
  let fixture: ComponentFixture<Acces>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Acces]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Acces);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
