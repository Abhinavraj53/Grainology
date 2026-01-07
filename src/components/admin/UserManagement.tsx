import { useState } from 'react';
import { Profile, supabase } from '../../lib/supabase';
import { Search, Filter, Shield, CheckCircle, XCircle, User, Building, Eye } from 'lucide-react';

interface UserManagementProps {
  users: Profile[];
  onRefresh: () => void;
}

export default function UserManagement({ users, onRefresh }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.business_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesKyc = kycFilter === 'all' || user.kyc_status === kycFilter;

    return matchesSearch && matchesRole && matchesKyc;
  });

  const handleVerifyKYC = async (userId: string) => {
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        kyc_status: 'verified',
        kyc_verified_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
    } else {
      onRefresh();
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, kyc_status: 'verified' });
      }
    }

    setLoading(false);
  };

  const handleRejectKYC = async (userId: string) => {
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ kyc_status: 'rejected' })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
    } else {
      onRefresh();
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, kyc_status: 'rejected' });
      }
    }

    setLoading(false);
  };

  const handleChangeRole = async (userId: string, newRole: 'farmer' | 'trader' | 'admin') => {
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
    } else {
      onRefresh();
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }
    }

    setLoading(false);
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
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
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString()}
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

                {(selectedUser as any).verification_documents && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Verification Documents</h4>
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
                          <span className="text-gray-600">CIN:</span>
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
                      onChange={(e) => handleChangeRole(selectedUser.id, e.target.value as any)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    >
                      <option value="farmer">Farmer</option>
                      <option value="trader">Trader</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                {selectedUser.kyc_status !== 'verified' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      KYC Verification
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyKYC(selectedUser.id)}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Verify KYC
                      </button>
                      <button
                        onClick={() => handleRejectKYC(selectedUser.id)}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject KYC
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
