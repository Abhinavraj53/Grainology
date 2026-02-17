import { useState, useEffect } from 'react';
import { type Profile } from '../../lib/client';
import { Search, Filter, Shield, CheckCircle, XCircle, User, Building, Eye, FileText, Download, ThumbsUp, ThumbsDown, UserPlus } from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getDocumentTypeLabel(docType: string, documentTypeLabel?: string): string {
  if (docType === 'other' && documentTypeLabel && documentTypeLabel.trim()) {
    return documentTypeLabel.trim();
  }
  const labels: Record<string, string> = {
    cin: 'Incorporation Certificate',
    aadhaar: 'Aadhaar',
    pan: 'PAN',
    driving_license: 'Driving License',
    voter_id: 'Voter ID',
    passport: 'Passport',
    gstin: 'GSTIN',
    other: 'Other',
    registration_certificate: 'Incorporation Certificate', // legacy – show as Incorporation Certificate
  };
  return labels[docType || ''] || (docType || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function adminUpdateUser(userId: string, body: Record<string, unknown>) {
  const token = localStorage.getItem('auth_token');
  const id = String(userId).trim();
  if (!id || id === 'undefined') throw new Error('Invalid user id');
  const res = await fetch(`${apiUrl}/admin/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Update failed');
  }
  return res.json();
}

interface UserManagementProps {
  users: Profile[];
  onRefresh: () => void;
  onUserUpdated?: (userId: string, updates: Partial<Profile>) => void;
}

export default function UserManagement({ users, onRefresh, onUserUpdated }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userDocument, setUserDocument] = useState<any>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<{ view_url: string; file_name?: string; document_type?: string; document_type_label?: string; view_access?: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [disapproveConfirmUserId, setDisapproveConfirmUserId] = useState<string | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user as any).mobile_number?.includes(searchTerm) ||
      user.business_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesKyc = kycFilter === 'all' || user.kyc_status === kycFilter;
    const matchesApproval = approvalFilter === 'all' || (user as any).approval_status === approvalFilter;

    return matchesSearch && matchesRole && matchesKyc && matchesApproval;
  });

  // Load PDF via backend proxy (uses signed view_access token so no auth header needed)
  useEffect(() => {
    const isPdf = viewerDoc?.file_name?.toLowerCase().endsWith('.pdf');
    if (!viewerDoc || !isPdf) {
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPdfError(null);
      return;
    }
    let cancelled = false;
    const blobUrlRef = { current: null as string | null };
    setLoadingPdf(true);
    setPdfError(null);
    (async () => {
      try {
        // Prefer signed access token (works without Authorization header)
        const useAccessToken = viewerDoc.view_access;
        const proxyUrl = useAccessToken
          ? `${apiUrl}/documents/view?url=${encodeURIComponent(viewerDoc.view_url)}&access=${encodeURIComponent(viewerDoc.view_access!)}`
          : `${apiUrl}/admin/documents/view?url=${encodeURIComponent(viewerDoc.view_url)}`;
        const headers: Record<string, string> = { Accept: 'application/pdf,*/*' };
        if (!useAccessToken) {
          const token = localStorage.getItem('auth_token');
          if (token) headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(proxyUrl, { headers });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const rawMessage = err.error || res.statusText || 'Failed to load PDF';
          let friendlyMessage = rawMessage;
          if (err.error === 'File blocked in Cloudinary' && err.message) {
            friendlyMessage = err.message;
          } else if (err.error === 'Invalid or expired view link' && err.message) {
            friendlyMessage = err.message;
          } else if (res.status === 401 || res.status === 403) {
            friendlyMessage = 'Link expired or invalid. Close and open the document again from the list.';
          }
          if (!cancelled) setPdfError(friendlyMessage);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        if (blob.size === 0) {
          if (!cancelled) setPdfError('Document is empty. Try "Get fresh link" or open in new tab.');
          return;
        }
        const contentType = res.headers.get('content-type') || blob.type || '';
        const isPdfResponse = /pdf/.test(contentType) || /pdf/.test(blob.type);
        if (!isPdfResponse) {
          if (!cancelled) setPdfError('Response is not a PDF. Try "Get fresh link" or open in new tab.');
          return;
        }
        const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([await blob.arrayBuffer()], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(pdfBlob);
        blobUrlRef.current = blobUrl;
        setPdfBlobUrl(blobUrl);
      } catch (e: any) {
        if (!cancelled) setPdfError(e.message || 'Failed to load PDF');
      } finally {
        if (!cancelled) setLoadingPdf(false);
      }
    })();
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [viewerDoc?.view_url, viewerDoc?.view_access, viewerDoc?.file_name]);

  const handleChangeRole = async (userId: string, newRole: 'farmer' | 'trader' | 'admin') => {
    setLoading(true);
    setError('');
    try {
      await adminUpdateUser(userId, { role: newRole });
      onRefresh();
      if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, role: newRole });
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
    setLoading(false);
  };

  const handleApprove = async (userId: string) => {
    const id = typeof userId === 'string' ? userId.trim() : '';
    if (!id) return;
    setLoading(true);
    setError('');
    const patch = { approval_status: 'approved' as const };
    const previousStatus = (users.find(u => getUserId(u) === id) as any)?.approval_status;
    onUserUpdated?.(id, patch);
    if (selectedUser && getUserId(selectedUser) === id) setSelectedUser({ ...selectedUser, ...patch });
    try {
      await adminUpdateUser(id, { approval_status: 'approved' });
      onRefresh();
    } catch (e: any) {
      onUserUpdated?.(id, { approval_status: previousStatus ?? 'pending' });
      if (selectedUser && getUserId(selectedUser) === id) setSelectedUser(prev => prev ? { ...prev, approval_status: previousStatus ?? 'pending' } : null);
      setError(e.message || 'Failed to approve');
    }
    setLoading(false);
  };

  const handleDisapprove = async (userId: string) => {
    const id = typeof userId === 'string' ? userId.trim() : '';
    if (!id || id === 'undefined') {
      setDisapproveConfirmUserId(null);
      return;
    }
    setDisapproveConfirmUserId(null);
    setLoading(true);
    setError('');
    const patch = { approval_status: 'rejected' as const };
    // Optimistic update: update UI immediately so list/card updates without full refresh
    const previousStatus = (users.find(u => getUserId(u) === id) as any)?.approval_status;
    onUserUpdated?.(id, patch);
    if (selectedUser && getUserId(selectedUser) === id) setSelectedUser({ ...selectedUser, ...patch });
    try {
      await adminUpdateUser(id, { approval_status: 'rejected' });
      onRefresh(); // refetch in background to keep data in sync
    } catch (e: any) {
      // Revert on failure
      onUserUpdated?.(id, { approval_status: previousStatus ?? 'pending' });
      if (selectedUser && getUserId(selectedUser) === id) setSelectedUser(prev => prev ? { ...prev, approval_status: previousStatus ?? 'pending' } : null);
      setError(e.message || 'Failed to disapprove');
    }
    setLoading(false);
  };

  const pendingUsers = users.filter(u => (u as any).approval_status === 'pending');

  const getUserId = (user: Profile | null): string => {
    if (!user) return '';
    const raw = (user as any).id ?? (user as any)._id;
    if (raw == null) return '';
    return typeof raw === 'string' ? raw.trim() : String(raw);
  };

  // Fetch user verification document when user is selected
  useEffect(() => {
    const userId = getUserId(selectedUser);
    if (userId) {
      fetchUserDocument(userId);
    } else {
      setUserDocument(null);
    }
  }, [selectedUser]);

  const fetchUserDocument = async (userId: string) => {
    if (!userId || userId === 'undefined') {
      setUserDocument(null);
      setLoadingDocument(false);
      return;
    }
    setLoadingDocument(true);
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${apiUrl}/admin/users/${userId}/verification-document`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserDocument({ document: data.document, documents: data.documents || (data.document ? [data.document] : []), user: data.user });
        } else {
          setUserDocument(null);
        }
      } else {
        setUserDocument(null);
      }
    } catch (err) {
      console.error('Error fetching user document:', err);
      setUserDocument(null);
    } finally {
      setLoadingDocument(false);
    }
  };

  const handleGetFreshDocumentLink = async () => {
    const userId = getUserId(selectedUser);
    if (!userId || !viewerDoc) return;
    setPdfError(null);
    setLoadingPdf(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${apiUrl}/admin/users/${userId}/verification-document`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.documents?.length) {
        const doc = data.documents.find((d: any) => d.view_url === viewerDoc.view_url) || data.document;
        if (doc?.view_access) {
          setViewerDoc({ ...viewerDoc, view_access: doc.view_access });
          return;
        }
      }
      if (res.ok && data.success && data.document?.view_access && data.document?.view_url === viewerDoc.view_url) {
        setViewerDoc({ ...viewerDoc, view_access: data.document.view_access });
        return;
      }
      setPdfError('Could not get a fresh link. Please close and open the document again from the list.');
    } catch {
      setPdfError('Could not get a fresh link. Please close and open the document again from the list.');
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or business name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="farmer">Farmer</option>
              <option value="trader">Trader</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All KYC Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="not_started">Not Started</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Approval</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium mb-1">Total Users</p>
            <p className="text-3xl font-bold text-blue-800">{users.length}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 font-medium mb-1">Verified</p>
            <p className="text-3xl font-bold text-green-800">
              {users.filter(u => u.kyc_status === 'verified').length}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700 font-medium mb-1">Pending KYC</p>
            <p className="text-3xl font-bold text-yellow-800">
              {users.filter(u => u.kyc_status === 'pending' || u.kyc_status === 'not_started').length}
            </p>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <p className="text-sm text-teal-700 font-medium mb-1">Traders</p>
            <p className="text-3xl font-bold text-teal-800">
              {users.filter(u => u.role === 'trader').length}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* New Users / Pending Approval – dedicated section */}
        {pendingUsers.length > 0 && (
          <div className="mb-6 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-amber-200 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-amber-700" />
                <h3 className="text-lg font-semibold text-amber-900">New Users</h3>
                <span className="px-2.5 py-0.5 text-sm font-medium rounded-full bg-amber-200 text-amber-900">
                  {pendingUsers.length} pending
                </span>
              </div>
              <p className="text-sm text-amber-800">Approve or disapprove access. Approved users can log in.</p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingUsers.slice(0, 12).map((user, idx) => (
                  <div
                    key={getUserId(user) || user.name || `user-${idx}`}
                    className="bg-white rounded-lg border border-amber-100 p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email || (user as any).mobile_number}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      </div>
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(getUserId(user) || '')}
                        disabled={loading}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => { const id = getUserId(user); if (id) setDisapproveConfirmUserId(id); }}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50"
                        title="Set back to pending"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Disapprove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {pendingUsers.length > 12 && (
                <p className="text-sm text-amber-800 mt-3">+ {pendingUsers.length - 12} more in table below</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approval</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user, idx) => (
                <tr key={getUserId(user) || user.name || `row-${idx}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      {user.entity_type === 'company' && user.business_name && (
                        <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                          <Building className="w-3 h-3" />
                          {user.business_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {user.entity_type === 'company' ? (
                        <>
                          <Building className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-900">Company</span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-900">Individual</span>
                        </>
                      )}
                    </div>
                    {user.business_type && (
                      <p className="text-xs text-gray-500 mt-1 capitalize">
                        {user.business_type.replace('_', ' ')}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'farmer' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      user.kyc_status === 'verified' ? 'bg-green-100 text-green-800' :
                      user.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      user.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.kyc_status === 'not_started' ? 'Not Started' : user.kyc_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      (user as any).approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                      (user as any).approval_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {(user as any).approval_status === 'approved' ? 'Approved' : (user as any).approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date((user as any).createdAt || user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No users found</p>
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">User Management</h3>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setError('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">User Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium text-gray-900">{selectedUser.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="text-gray-900">{selectedUser.email || 'N/A'}</p>
                    </div>
                    {(userDocument?.user?.trade_name || (selectedUser as any).trade_name) && (
                      <div>
                        <span className="text-gray-600">Trade Name:</span>
                        <p className="text-gray-900">{userDocument?.user?.trade_name || (selectedUser as any).trade_name}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Password:</span>
                      <p className="text-gray-900 font-mono">•••••••• (stored securely – not visible)</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Mobile Number:</span>
                      <p className="text-gray-900">{selectedUser.mobile_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Preferred Language:</span>
                      <p className="text-gray-900">{selectedUser.preferred_language || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Entity Type:</span>
                      <p className="capitalize text-gray-900">{selectedUser.entity_type || 'N/A'}</p>
                    </div>
                    {selectedUser.entity_type === 'company' && (
                      <>
                        <div>
                          <span className="text-gray-600">Business Name:</span>
                          <p className="font-medium text-gray-900">{selectedUser.business_name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Business Type:</span>
                          <p className="capitalize text-gray-900">
                            {selectedUser.business_type?.replace('_', ' ') || 'N/A'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Address Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Address Line 1:</span>
                      <p className="text-gray-900">{selectedUser.address_line1 || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Address Line 2:</span>
                      <p className="text-gray-900">{selectedUser.address_line2 || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">District:</span>
                      <p className="text-gray-900">{selectedUser.district || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">State:</span>
                      <p className="text-gray-900">{selectedUser.state || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Country:</span>
                      <p className="text-gray-900">{selectedUser.country || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Pincode:</span>
                      <p className="text-gray-900">{selectedUser.pincode || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Account Status</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Current Role:</span>
                      <p className="capitalize font-medium text-gray-900">{selectedUser.role || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">KYC Status:</span>
                      <p className="capitalize font-medium text-gray-900">{selectedUser.kyc_status || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Approval Status:</span>
                      <p className="capitalize font-medium text-gray-900">{(selectedUser as any).approval_status ?? 'pending'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Created At:</span>
                      <p className="text-gray-900">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Updated At:</span>
                      <p className="text-gray-900">{(selectedUser as any).updatedAt ? new Date((selectedUser as any).updatedAt).toLocaleString() : 'N/A'}</p>
                    </div>
                    {selectedUser.kyc_verified_at && (
                      <div>
                        <span className="text-gray-600">KYC Verified At:</span>
                        <p className="text-gray-900">{new Date(selectedUser.kyc_verified_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Uploaded Verification Document(s) */}
                {loadingDocument ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Loading document(s)...</p>
                  </div>
                ) : userDocument?.documents?.length ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Uploaded Verification Documents ({userDocument.documents.length})
                    </h4>
                    <div className="space-y-4">
                      {userDocument.documents.map((doc: any, idx: number) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-medium text-gray-900">
                                {getDocumentTypeLabel(doc.document_type, (doc as { document_type_label?: string }).document_type_label)}
                              </p>
                              {doc.file_name && (
                                <p className="text-xs text-gray-600">{doc.file_name}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {doc.view_url && (
                                <button
                                  type="button"
                                  onClick={() => setViewerDoc({ view_url: doc.view_url, file_name: doc.file_name, document_type: doc.document_type, document_type_label: (doc as { document_type_label?: string }).document_type_label, view_access: (doc as { view_access?: string }).view_access })}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>
                              )}
                              {(doc.view_url && (doc as { view_access?: string }).view_access ? true : doc.download_url) && (
                                <a
                                  href={(doc as { view_access?: string }).view_access
                                    ? `${apiUrl}/documents/view?url=${encodeURIComponent(doc.view_url)}&access=${encodeURIComponent((doc as { view_access?: string }).view_access)}&download=1&filename=${encodeURIComponent(doc.file_name || 'document.pdf')}`
                                    : doc.download_url!}
                                  download={(doc.file_name || 'document.pdf').replace(/[^\w.-]/g, '_')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : userDocument?.document ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Uploaded Verification Document
                    </h4>
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">
                        {getDocumentTypeLabel(userDocument.document.document_type, (userDocument.document as { document_type_label?: string }).document_type_label)}
                      </p>
                      <div className="flex gap-2">
                        {userDocument.document.view_url && (
                          <button
                            type="button"
                            onClick={() => setViewerDoc({ view_url: userDocument.document.view_url, file_name: userDocument.document.file_name, document_type: userDocument.document.document_type, document_type_label: (userDocument.document as { document_type_label?: string }).document_type_label, view_access: (userDocument.document as { view_access?: string }).view_access })}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                          >
                            <Eye className="w-4 h-4" /> View
                          </button>
                        )}
                        {(userDocument.document.view_url && (userDocument.document as { view_access?: string }).view_access) || userDocument.document.download_url ? (
                          <a
                            href={(userDocument.document as { view_access?: string }).view_access
                              ? `${apiUrl}/documents/view?url=${encodeURIComponent(userDocument.document.view_url)}&access=${encodeURIComponent((userDocument.document as { view_access?: string }).view_access)}&download=1&filename=${encodeURIComponent(userDocument.document.file_name || 'document.pdf')}`
                              : userDocument.document.download_url!}
                            download={(userDocument.document.file_name || 'document.pdf').replace(/[^\w.-]/g, '_')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
                          >
                            <Download className="w-4 h-4" /> Download
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : !loadingDocument ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Uploaded Verification Document
                    </h4>
                    <p className="text-gray-500 text-sm">No document uploaded by this user.</p>
                  </div>
                ) : null}

                {/* Old Verification Documents (from Cashfree/Aadhaar) */}
                {(selectedUser as any).verification_documents && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Verification Documents (Legacy)</h4>
                    <div className="space-y-2 text-sm">
                      {(selectedUser as any).verification_documents?.aadhaar_number && (
                        <div>
                          <span className="text-gray-600">Aadhaar Number:</span>
                          <p className="text-gray-900 font-mono">{(selectedUser as any).verification_documents.aadhaar_number}</p>
                        </div>
                      )}
                      {(selectedUser as any).verification_documents?.pan_number && (
                        <div>
                          <span className="text-gray-600">PAN Number:</span>
                          <p className="text-gray-900 font-mono">{(selectedUser as any).verification_documents.pan_number}</p>
                        </div>
                      )}
                      {(selectedUser as any).verification_documents?.gstin && (
                        <div>
                          <span className="text-gray-600">GSTIN:</span>
                          <p className="text-gray-900 font-mono">{(selectedUser as any).verification_documents.gstin}</p>
                        </div>
                      )}
                      {(selectedUser as any).verification_documents?.cin && (
                        <div>
                          <span className="text-gray-600">Incorporation Certificate (CIN):</span>
                          <p className="text-gray-900 font-mono">{(selectedUser as any).verification_documents.cin}</p>
                        </div>
                      )}
                      {!(selectedUser as any).verification_documents?.aadhaar_number && 
                       !(selectedUser as any).verification_documents?.pan_number && 
                       !(selectedUser as any).verification_documents?.gstin && 
                       !(selectedUser as any).verification_documents?.cin && (
                        <p className="text-gray-500">No verification documents</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedUser.kyc_data && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    KYC Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Verification Type:</span>
                      <p className="font-medium text-gray-900 capitalize">
                        {selectedUser.kyc_data.verificationType?.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Document Number:</span>
                      <p className="font-mono text-gray-900">{selectedUser.kyc_data.documentNumber}</p>
                    </div>
                    {selectedUser.kyc_data.verifiedAt && (
                      <div>
                        <span className="text-gray-600">Verified At:</span>
                        <p className="text-gray-900">{new Date(selectedUser.kyc_data.verifiedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Change User Role
                  </label>
                  <div className="flex gap-2">
                    <select
                      defaultValue={selectedUser.role}
                      onChange={(e) => handleChangeRole(getUserId(selectedUser) || '', e.target.value as any)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    >
                      <option value="farmer">Farmer</option>
                      <option value="trader">Trader</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Approval
                  </label>
                  <div className="flex gap-2">
                    {(selectedUser as any).approval_status !== 'approved' ? (
                      <button
                        onClick={() => handleApprove(getUserId(selectedUser) || '')}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Approve (sends email if they have one)
                      </button>
                    ) : (
                      <button
                        onClick={() => { const id = getUserId(selectedUser); if (id) setDisapproveConfirmUserId(id); }}
                        disabled={loading}
                        className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Disapprove (user cannot login)
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document viewer popup – opens image/PDF inside admin panel */}
      {viewerDoc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setViewerDoc(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700 truncate">
                {viewerDoc.file_name || getDocumentTypeLabel(viewerDoc.document_type || '', viewerDoc.document_type_label)}
              </span>
              <button
                type="button"
                onClick={() => setViewerDoc(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Close"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-auto bg-gray-100">
              {viewerDoc.file_name?.toLowerCase().endsWith('.pdf') ? (
                <>
                  {loadingPdf && (
                    <div className="flex items-center justify-center h-[75vh] text-gray-500">
                      Loading PDF…
                    </div>
                  )}
                  {pdfError && (
                    <div className="flex flex-col items-center justify-center h-[75vh] gap-3 text-red-600 max-w-md text-center">
                      <p>{pdfError}</p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleGetFreshDocumentLink}
                          disabled={loadingPdf || !getUserId(selectedUser)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                        >
                          {loadingPdf ? 'Loading…' : 'Get fresh link'}
                        </button>
                        <a
                          href={viewerDoc.view_access
                            ? `${apiUrl}/documents/view?url=${encodeURIComponent(viewerDoc.view_url)}&access=${encodeURIComponent(viewerDoc.view_access)}`
                            : viewerDoc.view_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 text-blue-600 hover:underline text-sm"
                        >
                          Open in new tab
                        </a>
                      </div>
                    </div>
                  )}
                  {!loadingPdf && !pdfError && pdfBlobUrl && (
                    <iframe
                      src={pdfBlobUrl}
                      title="Document"
                      className="w-full h-[75vh] border-0 rounded-lg bg-white"
                    />
                  )}
                  <p className="text-center mt-2 text-sm text-gray-600">
                    If the PDF doesn’t display above,{' '}
                    <a
                      href={viewerDoc.view_access
                        ? `${apiUrl}/documents/view?url=${encodeURIComponent(viewerDoc.view_url)}&access=${encodeURIComponent(viewerDoc.view_access)}`
                        : viewerDoc.view_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      open in new tab
                    </a>
                  </p>
                </>
              ) : (
                <img
                  src={viewerDoc.view_url}
                  alt="Document"
                  className="max-w-full max-h-[75vh] w-auto h-auto object-contain mx-auto rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disapprove confirmation modal */}
      {disapproveConfirmUserId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setDisapproveConfirmUserId(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Disapprove user?</h3>
            <p className="text-gray-600 mb-6">This user will not be able to log in until approved again. Are you sure you want to disapprove?</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDisapproveConfirmUserId(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (disapproveConfirmUserId) handleDisapprove(disapproveConfirmUserId); }}
                disabled={loading || !disapproveConfirmUserId}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
