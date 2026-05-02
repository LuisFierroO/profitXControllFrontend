import { Component } from '@angular/core';
import { RouterOutlet } from "@angular/router";
import { Nabvar } from "../../features/admin-business/pages/nabvar/nabvar";

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Nabvar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {

}
