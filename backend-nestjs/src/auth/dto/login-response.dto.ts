export class LoginResponseDto {
  user: {
    id: string;
    email: string;
    name: string;
    companyId: string;
    roles: string[];
    permissions: string[];
  };
}
