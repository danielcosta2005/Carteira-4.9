import { invokeAdmin } from './invokeAdmin';

export async function adminCreateUser({ email, password, projectId, role }) {
  return invokeAdmin('admin-create-user', { email, password, projectId, role });
}

export async function adminUpdateUser({ userId, password, projectId, role }) {
  return invokeAdmin('admin-update-user', { userId, password, projectId, role });
}

export async function adminRemoveMember({ userId, projectId }) {
  return invokeAdmin('admin-remove-member', { userId, projectId });
}