import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { UserService } from '../../../../shared/services/user.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ThemeService } from '../../../../shared/services/theme.service';

@Component({
    selector: 'app-nabvar',
    imports: [RouterLink, RouterLinkActive, MatIconModule],
    templateUrl: './nabvar.html',
    styleUrl: './nabvar.scss',
})
export class Nabvar implements OnInit {
    private router      = inject(Router);
    private userService = inject(UserService);
    private authService = inject(AuthService);

    theme    = inject(ThemeService);
    nameUser = signal<string | null>(null);
    menuOpen = signal(false);

    ngOnInit(): void {
        this.userService.findMe().subscribe({
            next: (res) => this.nameUser.set(res.firstName + ' ' + res.lastName),
            error: () => {},
        });
    }

    toggleMenu(): void { this.menuOpen.update(v => !v); }

    exit(): void {
        this.menuOpen.set(false);
        this.authService.logout();
        this.router.navigate(['/']);
    }
}
