'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Button, Input, Select } from '@/components/ui';
import { api } from '@/lib/api';

interface UserSettings {
  id: string;
  userId: string;
  currency: string;
  currencySymbol: string;
  language: string;
  timezone: string;
  dateFormat: string;
}

interface TenantMember {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'active' | 'removed';
  invitedAt: string;
  joinedAt?: string;
  userName?: string;
  userEmail?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    role: 'member' as 'admin' | 'member',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadSettings();
    loadMembers();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const response = await api.getSettings() as any;
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const loadMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const response = await api.getTenantMembers() as any;
      if (response.success) {
        setMembers(response.data.filter((m: TenantMember) => m.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setIsSaving(true);
      setErrorMessage('');
      const response = await api.updateSettings(settings) as any;
      if (response.success) {
        setSuccessMessage('Settings saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      setErrorMessage('');
      const response = await api.inviteTenantMember(inviteData) as any;
      if (response.success) {
        setSuccessMessage(`Member invited successfully! Temp password: ${response.data.tempPassword}`);
        setShowInviteModal(false);
        setInviteData({ email: '', name: '', role: 'member' });
        await loadMembers();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to invite member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await api.removeTenantMember(id) as any;
      if (response.success) {
        setSuccessMessage('Member removed successfully!');
        await loadMembers();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to remove member');
    }
  };

  const activeMemberCount = members.length;
  const canInviteMore = activeMemberCount < 3;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account preferences and family members</p>
          </div>

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* User Settings Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">⚙️</span> Preferences
            </h2>

            {isLoadingSettings ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : settings ? (
              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Currency"
                    value={settings.currency}
                    onChange={(e) => {
                      const currency = e.target.value;
                      const symbols: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' };
                      setSettings({
                        ...settings,
                        currency,
                        currencySymbol: symbols[currency] || '$',
                      });
                    }}
                    options={[
                      { value: 'GBP', label: '£ GBP - British Pound' },
                      { value: 'USD', label: '$ USD - US Dollar' },
                      { value: 'EUR', label: '€ EUR - Euro' },
                    ]}
                  />

                  <Select
                    label="Date Format"
                    value={settings.dateFormat}
                    onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                    options={[
                      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK)' },
                      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
                      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
                    ]}
                  />

                  <Select
                    label="Language"
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'es', label: 'Español' },
                      { value: 'fr', label: 'Français' },
                    ]}
                  />

                  <Select
                    label="Timezone"
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    options={[
                      { value: 'Europe/London', label: 'London (GMT)' },
                      { value: 'America/New_York', label: 'New York (EST)' },
                      { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
                      { value: 'Europe/Paris', label: 'Paris (CET)' },
                    ]}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" isLoading={isSaving}>
                    Save Preferences
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 text-gray-500">Failed to load settings</div>
            )}
          </div>

          {/* Family Members Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">👥</span> Family Members
              </h2>
              <Button
                onClick={() => setShowInviteModal(true)}
                disabled={!canInviteMore}
                variant="secondary"
              >
                {canInviteMore ? 'Invite Member' : 'Limit Reached (3/3)'}
              </Button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {activeMemberCount} of 3 members • {canInviteMore ? `${3 - activeMemberCount} slot${3 - activeMemberCount > 1 ? 's' : ''} available` : 'Upgrade for more members'}
            </p>

            {isLoadingMembers ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No additional members yet. Invite family members to collaborate.
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {member.userName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{member.userName}</div>
                        <div className="text-sm text-gray-600">{member.userEmail}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          member.role === 'owner'
                            ? 'bg-purple-100 text-purple-700'
                            : member.role === 'admin'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                      {member.role !== 'owner' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invite Member Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Invite Family Member</h3>
                <form onSubmit={handleInviteMember} className="space-y-4">
                  <Input
                    label="Name"
                    type="text"
                    value={inviteData.name}
                    onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                    required
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    required
                  />

                  <Select
                    label="Role"
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as any })}
                    options={[
                      { value: 'member', label: 'Member - Can view and add transactions' },
                      { value: 'admin', label: 'Admin - Full access' },
                    ]}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" isLoading={isSaving}>
                      Send Invitation
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowInviteModal(false);
                        setInviteData({ email: '', name: '', role: 'member' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
