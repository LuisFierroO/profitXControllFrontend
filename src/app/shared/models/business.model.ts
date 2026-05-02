export interface BusinessResponse {
    id: string;
    name: string;
    description: string | null;
    imgUrl: string | null;
    currentUserRole: 'OWNER' | 'ADMIN' | 'EMPLOYEE' | null;
}
