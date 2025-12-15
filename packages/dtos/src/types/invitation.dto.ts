export interface Invitation {
  id?: string;
  email: string;
  site_id: string;
  role: 'admin' | 'client';
  token: string;
  expires_at: string;
  accepted: boolean;
  created_at?: string;
}

export interface CreateInvitationRequest {
  email: string;
  site_id: string;
  role: 'admin' | 'client';
}

export interface InvitationWithSite extends Invitation {
  sites?: {
    address: string;
  };
}

export interface AcceptInvitationRequest {
  token: string;
  user_id: string;
}

export interface InvitationResponse {
  message: string;
  invitation?: {
    id: string;
    email: string;
    role: string;
    expires_at: string;
  };
  site_id?: string;
  role?: string;
}
