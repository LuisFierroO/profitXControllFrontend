import { Component, inject, OnInit,signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MembershipService } from '../../services/membership.service';
import { MembershipResponse, Role } from '../../models/membership.model';
import { debounceTime } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { BusinessContextService } from '../../../../shared/services/business-context.service';

@Component({
    selector: 'app-members',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatSnackBarModule,
    ],
    templateUrl: './members.html',
    styleUrl: './members.scss',
})
export class Members implements OnInit {

    private membershipService = inject(MembershipService);
    private fb = inject(FormBuilder);
    private snackBar = inject(MatSnackBar);
    private cdr = inject(ChangeDetectorRef);
    private confirmDialog = inject(ConfirmDialogService);
    protected context = inject(BusinessContextService);

    businessId!: string;
    allMembers = signal<MembershipResponse[]>([]);
    filteredMembers = signal<MembershipResponse[]>([]);
    isLoading = true;
    isSubmitting = false;

    get canManage(): boolean {
        const r = this.context.role();
        return r === 'OWNER' || r === 'ADMIN';
    }
    get canManageRole(): boolean { return this.context.role() === 'OWNER'; }
    // Filtros
    searchControl = new FormControl('');
    roleFilter = new FormControl<'ALL' | Role>('ALL');

    // Dialog agregar
    showAddDialog = false;
    addForm!: FormGroup;

    

    // Dialog cambiar rol
    selectedMember: MembershipResponse | null = null;
    newRole: Role = 'EMPLOYEE';

    ngOnInit(): void {
        const id = localStorage.getItem('currentBusinessId');

        if (!id) {
            this.snackBar.open('No se encontro el negocio', 'Cerrar', { duration: 3000 });
            return;
        }

        this.businessId = id;
        this.loadMembers();

        this.addForm = this.fb.group({
            userEmail: ['', [Validators.required, Validators.email]],
            role:      ['EMPLOYEE', Validators.required],
        });

        this.searchControl.valueChanges
            .pipe(debounceTime(200))
            .subscribe(() => this.applyFilters());
        this.roleFilter.valueChanges
            .subscribe(() => this.applyFilters());
    }

    private loadMembers(): void {
        this.isLoading = true;
        this.membershipService.findByBusiness(this.businessId).subscribe({
            next: members => {
                // OWNER siempre primero, luego ADMIN, luego EMPLOYEE
                this.allMembers.set(members.sort((a, b) =>
                    this.roleOrder(a.role) - this.roleOrder(b.role)));
                this.applyFilters();
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.snackBar.open('Error al cargar los miembros', 'Cerrar', { duration: 3000 });
                this.isLoading = false;
            }
        });
    }

    private applyFilters(): void {
        const term = this.searchControl.value?.toLowerCase().trim() ?? '';
        const role = this.roleFilter.value ?? 'ALL';

        this.filteredMembers.set(this.allMembers().filter(m => {
            const matchesSearch = !term ||
                m.userFullName?.toLowerCase().includes(term) ||
                m.userEmail.toLowerCase().includes(term);
            const matchesRole = role === 'ALL' || m.role === role;
            return matchesSearch && matchesRole;
        }));
    }

    clearFilters(): void {
        this.searchControl.setValue('');
        this.roleFilter.setValue('ALL');
    }

    // ── Dialog agregar ────────────────────────────────────────────────────────

    openAddDialog(): void {
        this.addForm.reset({ userEmail: '', role: 'EMPLOYEE' });
        this.showAddDialog = true;
    }

    closeAddDialog(): void {
        this.showAddDialog = false;
    }

    addMember(): void {
        if (this.addForm.invalid) return;
        this.isSubmitting = true;

        this.membershipService.addMember(this.businessId, this.addForm.value).subscribe({
            next: (newMember) => {
                this.snackBar.open(
                    newMember.userFullName + ' agregado como ' + this.getRoleLabel(newMember.role),
                    'Cerrar', { duration: 3000 });
                this.showAddDialog = false;
                this.isSubmitting = false;
                this.loadMembers();
            },
            error: (err) => {
                const msg = err.error?.error ?? 'Error al agregar el miembro';
                this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
                this.isSubmitting = false;
            }
        });
    }

    // ── Dialog cambiar rol ────────────────────────────────────────────────────

    openChangeRoleDialog(member: MembershipResponse): void {
        this.selectedMember = member;
        this.newRole = member.role === 'OWNER' ? 'ADMIN' : member.role;
    }

    closeChangeRoleDialog(): void {
        this.selectedMember = null;
    }

    saveRole(): void {
        if (!this.selectedMember || this.newRole === this.selectedMember.role) return;
        this.isSubmitting = true;

        this.membershipService.updateRole(
            this.businessId, this.selectedMember.id, this.newRole
        ).subscribe({
            next: () => {
                this.snackBar.open('Rol actualizado correctamente', 'Cerrar', { duration: 3000 });
                this.selectedMember = null;
                this.isSubmitting = false;
                this.loadMembers();
            },
            error: (err) => {
                const msg = err.error?.error ?? 'Error al cambiar el rol';
                this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
                this.isSubmitting = false;
            }
        });
    }

    // ── Eliminar ──────────────────────────────────────────────────────────────

    removeMember(member: MembershipResponse): void {
        const name = member.userFullName || member.userEmail;
        this.confirmDialog.confirm(`¿Confirmas que deseas eliminar a "${name}" del negocio?`)
            .subscribe(confirmed => {
                if (!confirmed) return;
                this.membershipService.removeMember(this.businessId, member.id).subscribe({
                    next: () => {
                        this.snackBar.open(name + ' eliminado del negocio', 'Cerrar', { duration: 3000 });
                        this.allMembers.set(this.allMembers().filter(m => m.id !== member.id));
                        this.applyFilters();
                    },
                    error: (err) => {
                        const msg = err.error?.error ?? 'Error al eliminar el miembro';
                        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
                    }
                });
            });
    }

    // ── Helpers visuales ─────────────────────────────────────────────────────

    getInitials(name: string): string {
        return name.trim().split(' ')
            .slice(0, 2)
            .map(w => w[0]?.toUpperCase() ?? '')
            .join('');
    }

    getRoleLabel(role: Role): string {
        const labels: Record<Role, string> = {
            OWNER: 'Dueno', ADMIN: 'Administrador', EMPLOYEE: 'Empleado'
        };
        return labels[role] ?? role;
    }

    getRoleClass(role: Role): string {
        const classes: Record<Role, string> = {
            OWNER: 'role-owner', ADMIN: 'role-admin', EMPLOYEE: 'role-employee'
        };
        return classes[role] ?? '';
    }

    getAvatarClass(role: Role): string {
        const classes: Record<Role, string> = {
            OWNER: 'avatar-owner', ADMIN: 'avatar-admin', EMPLOYEE: 'avatar-employee'
        };
        return classes[role] ?? '';
    }

    private roleOrder(role: Role): number {
        return { OWNER: 0, ADMIN: 1, EMPLOYEE: 2 }[role] ?? 3;
    }
}