export type ActionType =
    | 'VENTA_CREADA'
    | 'VENTA_MODIFICADA'
    | 'VENTA_ELIMINADA'
    | 'PRODUCTO_CREADO'
    | 'PRODUCTO_MODIFICADO'
    | 'PRODUCTO_ELIMINADO'
    | 'GASTO_CREADO'
    | 'GASTO_ELIMINADO'
    | 'MIEMBRO_AGREGADO'
    | 'ROL_MODIFICADO'
    | 'MIEMBRO_ELIMINADO';

export interface AuditLogResponse {
    id: string;
    userId: string;
    userEmail: string;
    action: ActionType;
    entityId: string;
    description: string;
    timestamp: string;
}

export interface AuditLogPage {
    content: AuditLogResponse[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}
