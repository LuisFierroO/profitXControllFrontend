import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatLabel } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
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
        MatIconModule,
    ],
    templateUrl: './nabvar.html',
    styleUrl: './nabvar.scss',
})
export class Nabvar implements OnInit {

    nameUser    = signal<String | null>(null);
    menuOpen    = signal(false);
    userService = inject(UserService);

    constructor(private router: Router) {}

    ngOnInit(): void {
        this.userService.findMe().subscribe({
            next: (response) => this.nameUser.set(response.firstName + ' ' + response.lastName),
            error: (err) => console.error('Error al obtener usuario', err),
        });
    }

    toggleMenu(): void { this.menuOpen.set(!this.menuOpen()); }

    listBusiness(): void {
        this.menuOpen.set(false);
        this.router.navigate(['app/bussines/list']);
    }

    createBusiness(): void {
        this.menuOpen.set(false);
        this.router.navigate(['app/bussines/create']);
    }

    exit(): void {
        this.menuOpen.set(false);
        localStorage.clear();
        this.router.navigate(['/']);
    }
}
