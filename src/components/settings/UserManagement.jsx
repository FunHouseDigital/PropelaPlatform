import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { UserPlus, Save } from 'lucide-react';

const MODULES = ['Dashboard', 'Nurses', 'Acquisition', 'Cohorts', 'Outreach', 'Placements', 'Analytics', 'Settings'];
const ROLES = ['Superadmin', 'Admin', 'Manager', 'Recruiter', 'Read-only'];

export default function UserManagement() {
  const { settings, updateSettings } = useAppContext();
  const [users, setUsers] = useState([...settings.users]);
  const [permissions, setPermissions] = useState({ ...settings.rolePermissions });
  const [activityLog] = useState([...settings.userActivityLog]);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Recruiter' });
  const [saved, setSaved] = useState(false);

  const handleInvite = () => {
    if (!inviteForm.name || !inviteForm.email) return;
    const newUser = {
      id: `user-${Date.now()}`,
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role,
      status: 'Invited',
      lastActive: null,
    };
    setUsers((prev) => [...prev, newUser]);
    setInviteForm({ name: '', email: '', role: 'Recruiter' });
  };

  const handlePermissionToggle = (role, module) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [module]: !prev[role][module] },
    }));
  };

  const handleSave = () => {
    const updated = { ...settings, users, rolePermissions: permissions };
    updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Name</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Email</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Role</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Status</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 px-3 font-medium text-gray-900">{user.name}</td>
                  <td className="py-2.5 px-3 text-gray-600">{user.email}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 bg-[#5B2D8E]/10 text-[#5B2D8E] rounded text-xs font-medium">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      user.status === 'Active' ? 'bg-green-50 text-green-700' :
                      user.status === 'Invited' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-500 text-xs">{formatDate(user.lastActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite User</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={inviteForm.name}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="user@propela.co.za"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleInvite}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2574] transition-colors"
          >
            <UserPlus size={14} />
            Invite
          </button>
        </div>
      </div>

      {/* Role Permissions Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Permissions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Role</th>
                {MODULES.map((mod) => (
                  <th key={mod} className="py-2.5 px-2 font-medium text-gray-600 text-center text-xs">{mod}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr key={role} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 px-3 font-medium text-gray-900">{role}</td>
                  {MODULES.map((mod) => (
                    <td key={mod} className="py-2.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={permissions[role]?.[mod] || false}
                        onChange={() => handlePermissionToggle(role, mod)}
                        className="w-4 h-4 rounded border-gray-300 text-[#5B2D8E] focus:ring-[#5B2D8E]"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Timestamp</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">User</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Action</th>
                <th className="text-left py-2.5 px-3 font-medium text-gray-600">Detail</th>
              </tr>
            </thead>
            <tbody>
              {activityLog.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 px-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(entry.timestamp)}</td>
                  <td className="py-2.5 px-3 font-medium text-gray-900">{entry.user}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-600">{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2574] transition-colors"
        >
          <Save size={16} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
