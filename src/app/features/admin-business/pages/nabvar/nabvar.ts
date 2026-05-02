import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatLabel } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { UserService } from '../../../../shared/services/user.service';

@Component({
    selector: 'app-nabvar',
    imports: [
        MatCard,
        MatButtonModule,
        MatCardContent,
        MatFormFieldModule,
        MatLabel,
    ],
    templateUrl: './nabvar.html',
    styleUrl: './nabvar.scss',
})
export class Nabvar implements OnInit {

    nameUser    = signal<String | null>(null);
    userService = inject(UserService);

    constructor(private router: Router) {}

    ngOnInit(): void {
        this.userService.findMe().subscribe({
            next: (response) => this.nameUser.set(response.firstName + ' ' + response.lastName),
            error: (err) => console.error('Error al obtener usuario', err),
        });
    }

    listBusiness()   { this.router.navigate(['app/bussines/list']); }
    createBusiness() { this.router.navigate(['app/bussines/create']); }

    exit(): void {
        localStorage.clear();
        this.router.navigate(['/']);
    }
}
