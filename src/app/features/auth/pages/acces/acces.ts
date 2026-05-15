import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { BusinessContextService } from '../../../../shared/services/business-context.service';
import { Login } from '../login/login';
import { Register } from '../register/register';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-acces',
    imports: [Login, Register, MatButtonModule, MatIconModule],
    templateUrl: './acces.html',
    styleUrl: './acces.scss',
})
export class Acces implements OnInit {
    private route    = inject(ActivatedRoute);
    private location = inject(Location);
    private context  = inject(BusinessContextService);

    registerActive = false;
    loginActive    = true;
    sessionExpired = signal(false);

    ngOnInit(): void {
        localStorage.removeItem('token');
        this.context.clear();

        if (this.route.snapshot.queryParams['reason'] === 'expired') {
            this.sessionExpired.set(true);
        }
    }

    dismissExpired(): void {
        this.sessionExpired.set(false);
        this.location.replaceState('/');
    }

    changeToRegister(): void {
        this.registerActive = true;
        this.loginActive    = false;
    }

    changeToLogin(): void {
        this.registerActive = false;
        this.loginActive    = true;
    }
}
