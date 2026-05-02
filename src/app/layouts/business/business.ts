import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from "../../features/business/pages/nav-bar/nav-bar";

@Component({
  selector: 'app-business',
  imports: [RouterOutlet, NavBar],
  templateUrl: './business.html',
  styleUrl: './business.scss',
})
export class Business {

}
