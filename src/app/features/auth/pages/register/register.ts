import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { TokenTimerService } from '../../../../shared/services/token-timer.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RegisterRequest } from '../../models/RegisterRequest';

@Component({
  selector: 'app-register',
  imports: [
    MatCardModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private authService = inject(AuthService);
  private timer       = inject(TokenTimerService);
  private router      = inject(Router);
  private snackBar    = inject(MatSnackBar);

  isLoading = false;

  registerForm = new FormGroup({
    firstName: new FormControl('', [Validators.required]),
    lastName: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  register() {
    if (this.registerForm.invalid) return;

    const data: RegisterRequest = this.registerForm.value as RegisterRequest;

    if (data.password !== this.registerForm.get('confirmPassword')?.value) {
      this.snackBar.open('Las contraseñas no coinciden', 'Cerrar', { duration: 3000 });
      return;
    }

    this.authService.register(data).subscribe({
      next: (session) => {
        this.timer.start(session.expiresIn);
        this.snackBar.open('Usuario registrado correctamente', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/app/bussines/list']);
        this.registerForm.reset();
      },
      error: (err) => {
        const msg = err.error?.error ?? 'Error al registrar el usuario';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        this.isLoading = false;
      },
    });
  }
}
