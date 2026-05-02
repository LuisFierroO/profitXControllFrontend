import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ConfirmDialog } from '../components/confirm-dialog/confirm-dialog';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
    private dialog = inject(MatDialog);

    confirm(message: string): Observable<boolean> {
        return this.dialog
            .open(ConfirmDialog, { data: { message }, width: '380px' })
            .afterClosed()
            .pipe(map(result => result === true));
    }
}
