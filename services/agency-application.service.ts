import apiClient from './api';
import type { User } from '../types';
import type { PickedFile } from './profile.service';

export const APPLICATION_FIELDS = [
  'agency_name', 'email', 'phone', 'address', 'city', 'commercial_register_number',
  'responsable_name', 'responsable_phone', 'responsable_position', 'responsable_identity_number',
] as const;

export const APPLICATION_DOCUMENTS = ['commercial_register_doc', 'identity_doc', 'tax_doc'] as const;

export type ApplicationField = (typeof APPLICATION_FIELDS)[number];
export type ApplicationDocument = (typeof APPLICATION_DOCUMENTS)[number];

export interface AgencyApplication {
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejection_reason?: string | null;
  tries_count: number;
  max_tries: number;
  attempts_left: number;
  can_resubmit: boolean;
  fields: Record<ApplicationField, string | null>;
  /** Which documents are on file (each can be replaced by a new PDF) */
  documents: Record<ApplicationDocument, boolean>;
}

/** A rejected agency corrects its application and sends it back for review (website: "Mise à jour des informations") */
export const agencyApplicationService = {
  async get(): Promise<AgencyApplication> {
    const { data } = await apiClient.get<{ data: AgencyApplication }>('/agence/application');
    return data.data;
  },

  async resubmit(fields: Record<ApplicationField, string>, documents: Partial<Record<ApplicationDocument, PickedFile>>): Promise<{ message: string; application: AgencyApplication; user: User }> {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.append(name, value);
    for (const [name, file] of Object.entries(documents)) {
      if (file?.file) form.append(name, file.file, file.name);
      else if (file) form.append(name, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    }
    const { data } = await apiClient.post<{ message: string; data: AgencyApplication; user: User }>('/agence/application', form);
    return { message: data.message, application: data.data, user: data.user };
  },
};
