import type {
  AuthUser,
  Job,
  JobInput,
  JobStatus,
  MessageTemplate,
  MessageTemplateInput,
  ProfileLink,
  ProfileLinkInput,
} from '@/lib/types';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const body = (await response.json()) as { message?: string };
      message = body.message ?? message;
    } catch {
      const errorBody = await response.text();
      if (errorBody) {
        message = errorBody;
      }
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function getAuthProviders() {
  return request<{ google: boolean }>('/api/auth/providers');
}

export function getCurrentUser() {
  return request<{ user: AuthUser | null }>('/api/auth/me');
}

export function signup(payload: { name: string; email: string; password: string }) {
  return request<{ user: AuthUser }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function login(payload: { email: string; password: string }) {
  return request<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return request<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
  });
}

export function getGoogleOAuthUrl() {
  return `${baseUrl}/api/auth/google`;
}

export function listJobs(status: JobStatus | 'all' = 'all') {
  const query = status === 'all' ? '' : `?status=${status}`;
  return request<Job[]>(`/api/jobs${query}`);
}

export function createJob(payload: JobInput) {
  return request<Job>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function markJobApplied(jobId: string) {
  return request<Job>(`/api/jobs/${jobId}/apply`, {
    method: 'PATCH',
  });
}

export function markJobPending(jobId: string) {
  return request<Job>(`/api/jobs/${jobId}/pending`, {
    method: 'PATCH',
  });
}

export function deleteJob(jobId: string) {
  return request<{ success: true }>(`/api/jobs/${jobId}`, {
    method: 'DELETE',
  });
}

export function listTemplates() {
  return request<MessageTemplate[]>('/api/templates');
}

export function createTemplate(payload: MessageTemplateInput) {
  return request<MessageTemplate>('/api/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTemplate(templateId: string, payload: MessageTemplateInput) {
  return request<MessageTemplate>(`/api/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteTemplate(templateId: string) {
  return request<{ success: true }>(`/api/templates/${templateId}`, {
    method: 'DELETE',
  });
}

export function listProfileLinks() {
  return request<ProfileLink[]>('/api/profile-links');
}

export function createProfileLink(payload: ProfileLinkInput) {
  return request<ProfileLink>('/api/profile-links', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProfileLink(linkId: string, payload: ProfileLinkInput) {
  return request<ProfileLink>(`/api/profile-links/${linkId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteProfileLink(linkId: string) {
  return request<{ success: true }>(`/api/profile-links/${linkId}`, {
    method: 'DELETE',
  });
}
