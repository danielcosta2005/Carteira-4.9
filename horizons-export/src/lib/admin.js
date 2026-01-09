import { invokeAdmin } from './invokeAdmin';

export async function adminCreateMember({ email, password, projectId, role }) {
  return invokeAdmin('admin-create-member', { email, password, projectId, role });
}

export async function adminUpdateMember({ memberId, password, projectId, role }) {
  return invokeAdmin('admin-update-member', { memberId, password, projectId, role });
}

export async function adminRemoveMember({ Id, projectId }) {
  return invokeAdmin('admin-remove-member', { memberId, projectId });
}