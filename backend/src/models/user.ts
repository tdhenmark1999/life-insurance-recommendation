export interface User {
    id: number;
    email: string;
    password_hash: string;
    name: string;
    created_at: Date;
    updated_at: Date;
    is_verified: boolean;
    otp_secret?: string;
    otp_enabled: boolean;
  }