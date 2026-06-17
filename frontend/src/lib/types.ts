export type JobStatus = 'pending' | 'applied';

export type Job = {
  _id: string;
  title: string;
  company: string;
  url: string;
  notes?: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
};

export type JobInput = {
  title: string;
  company: string;
  url: string;
  notes?: string;
};

export type AuthProvider = 'local' | 'google';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  provider: AuthProvider;
  avatarUrl: string;
};

export type TemplateCategory = 'recruiter' | 'referral' | 'about-me';

export type MessageTemplate = {
  id: string;
  title: string;
  category: TemplateCategory;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageTemplateInput = {
  title: string;
  category: TemplateCategory;
  message: string;
};

export type ProfileLink = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileLinkInput = {
  name: string;
  url: string;
};
