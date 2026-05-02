import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { TokenTimerService } from '../../../../shared/services/token-timer.service';
import { Router } from '@angular/router';
import { LoginRequest } from '../../models/LoginRequest';

@Component({
  selector: 'app-login',
  imports: [
    MatCardModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private authService = inject(AuthService);
  private timer       = inject(TokenTimerService);
  private router      = inject(Router);

  view = signal<'login' | 'forgot'>('login');
  forgotSent = signal(false);
  isLoading = signal(false);
  loginError = signal('');
  remainingAttempts = signal<number | null>(null);
  accountLocked = signal(false);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  constructor() {
    this.loginForm.valueChanges.subscribe(() => {
      this.loginError.set('');
      this.remainingAttempts.set(null);
      this.accountLocked.set(false);
    });
  }

  forgotForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  login() {
    if (this.loginForm.invalid) return;

    const data: LoginRequest = this.loginForm.value as LoginRequest;

    this.loginError.set('');
    this.remainingAttempts.set(null);
    this.accountLocked.set(false);
    this.isLoading.set(true);

    this.authService.login(data).subscribe({
      next: (session) => {
        this.isLoading.set(false);
        this.timer.start(session.expiresIn);
        this.loginForm.reset();
        this.router.navigate(['/app/bussines/list']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const body = err.error;
        this.remainingAttempts.set(body?.remainingAttempts ?? null);
        this.accountLocked.set(body?.accountLocked ?? false);
        this.loginError.set(body?.error ?? 'Correo o contraseña incorrectos');
      },
    });
  }

  sendResetLink() {
    if (this.forgotForm.invalid) return;

    this.isLoading.set(true);
    const email = this.forgotForm.value.email as string;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.forgotSent.set(true);
      },
      error: () => {
        this.isLoading.set(false);
        this.forgotSent.set(true);
      },
    });
  }

  showForgot() {
    this.forgotSent.set(false);
    this.forgotForm.reset();
    this.view.set('forgot');
  }

  showLogin() {
    this.view.set('login');
  }
}
