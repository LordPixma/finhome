'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { Button, Input, Select } from '@/components/ui';
import { api } from '@/lib/api';
import TenantDeletionModal from '@/components/TenantDeletionModal';
import { MFASettings } from '@/components/MFASettings';

interface UserSettings {
  id: string;
  userId: string;
  currency: string;
  currencySymbol: string;
  language: string;
  timezone: string;
  dateFormat: string;
  dashboardTourCompleted?: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
  bio?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
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

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security' | 'family'>('profile');
  
  // Settings and profile data
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Tenant deletion states
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ id: string; name: string; subdomain: string } | null>(null);
  
  // Loading states
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // UI states
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
    loadProfile();
    loadMembers();
    loadTenantInfo();
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

  const loadProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const response = await api.getProfile() as any;
      if (response.success) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setErrorMessage('Failed to load profile information');
    } finally {
      setIsLoadingProfile(false);
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

  const loadTenantInfo = async () => {
    try {
      const response = await api.getTenantInfo() as any;
      if (response.success) {
        setTenantInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to load tenant info:', error);
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setIsSaving(true);
      setErrorMessage('');
      const response = await fetch('/api/profile/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.data);
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.error?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    try {
      setIsChangingPassword(true);
      setErrorMessage('');
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSuccessMessage('Password changed successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.error?.message || 'Failed to change password');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPicture(true);
      setErrorMessage('');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/profile/profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      const data = await response.json();
      
      if (data.success) {
        setProfile(prev => prev ? { ...prev, profilePictureUrl: data.data.profilePictureUrl } : null);
        setSuccessMessage('Profile picture updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.error?.message || 'Failed to upload profile picture');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to upload profile picture');
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const activeMemberCount = members.length;
  const canInviteMore = activeMemberCount < 3;

  const TabButton: React.FC<{ 
    tab: 'profile' | 'preferences' | 'security' | 'family'; 
    label: string; 
    icon: string;
  }> = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        activeTab === tab 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

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

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <TabButton tab="profile" label="Profile" icon="👤" />
            <TabButton tab="preferences" label="Preferences" icon="⚙️" />
            <TabButton tab="security" label="Security" icon="🔒" />
            <TabButton tab="family" label="Family Members" icon="👨‍👩‍👧‍👦" />
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="text-2xl">👤</span> Profile Information
              </h2>

              {isLoadingProfile ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : profile ? (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {/* Profile Picture Section */}
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {profile.profilePictureUrl ? (
                        <Image 
                          src={profile.profilePictureUrl} 
                          alt="Profile" 
                          width={80}
                          height={80}
                          className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 border-4 border-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-2xl">👤</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isUploadingPicture}
                          onClick={(e) => {
                            e.preventDefault();
                            e.currentTarget.parentElement?.querySelector('input')?.click();
                          }}
                        >
                          {isUploadingPicture ? 'Uploading...' : 'Change Photo'}
                        </Button>
                      </label>
                      <p className="text-sm text-gray-500 mt-1">
                        JPEG, PNG, or WebP. Max size 5MB.
                      </p>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={profile.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <Input
                      label="Phone Number"
                      value={profile.phoneNumber || ''}
                      onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                      placeholder="+44 7xxx xxx xxx"
                    />
                    <Input
                      label="Date of Birth"
                      type="date"
                      value={profile.dateOfBirth || ''}
                      onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profile.bio || ''}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tell us about yourself..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {(profile.bio || '').length}/500 characters
                    </p>
                  </div>

                  {/* Address */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Input
                          label="Address Line 1"
                          value={profile.addressLine1 || ''}
                          onChange={(e) => setProfile({ ...profile, addressLine1: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label="Address Line 2"
                          value={profile.addressLine2 || ''}
                          onChange={(e) => setProfile({ ...profile, addressLine2: e.target.value })}
                          placeholder="Apartment, suite, etc. (optional)"
                        />
                      </div>
                      <Input
                        label="City"
                        value={profile.city || ''}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      />
                      <Input
                        label="State/County"
                        value={profile.state || ''}
                        onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      />
                      <Input
                        label="Postal Code"
                        value={profile.postalCode || ''}
                        onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                      />
                      <Select
                        label="Country"
                        value={profile.country || ''}
                        onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                        options={[
                          { value: '', label: 'Select Country' },
                          { value: 'GB', label: 'United Kingdom' },
                          { value: 'US', label: 'United States' },
                          { value: 'CA', label: 'Canada' },
                          { value: 'AU', label: 'Australia' },
                          { value: 'DE', label: 'Germany' },
                          { value: 'FR', label: 'France' },
                          { value: 'ES', label: 'Spain' },
                          { value: 'IT', label: 'Italy' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Failed to load profile information</p>
                </div>
              )}
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
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
                      ]}
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Dashboard Tour</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Restart the dashboard tour to learn about all the features available in Finhome360.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await api.updateSettings({ dashboardTourCompleted: false });
                          setSuccessMessage('Dashboard tour reset! Navigate to the dashboard to start the tour.');
                          setTimeout(() => setSuccessMessage(''), 3000);
                          window.location.href = '/dashboard';
                        } catch (error) {
                          setErrorMessage('Failed to reset tour');
                        }
                      }}
                    >
                      Restart Dashboard Tour
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8 text-gray-500">Failed to load settings</div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* MFA Settings Section */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="text-2xl">🔒</span> Two-Factor Authentication
                </h2>
                <MFASettings />
              </div>

              {/* Password Change Section */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="text-2xl">🔑</span> Password
                </h2>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose a strong password with at least 8 characters, including uppercase, lowercase, and numbers.
                  </p>
                </div>

                <Input
                  label="Current Password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                />

                <Input
                  label="New Password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={8}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                />

                {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}

                <div className="flex justify-start">
                  <Button type="submit" disabled={isChangingPassword || passwordData.newPassword !== passwordData.confirmPassword}>
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </form>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">⚠️</span> Danger Zone
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-red-900 mb-2">Delete Tenant</h4>
                      <p className="text-sm text-red-700 mb-4">
                        Permanently delete your tenant "{tenantInfo?.name || 'Unknown'}" and all associated data. 
                        This action cannot be undone and will remove all transactions, accounts, budgets, and family members.
                      </p>
                      
                      <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
                        <h5 className="font-semibold text-red-900 mb-2">What will be deleted:</h5>
                        <ul className="text-sm text-red-800 space-y-1">
                          <li>• All financial transactions and account data</li>
                          <li>• All budgets, goals, and bill reminders</li>
                          <li>• All categories and recurring transactions</li>
                          <li>• All family members and their access</li>
                          <li>• All user settings and preferences</li>
                          <li>• The entire tenant account</li>
                        </ul>
                      </div>

                      <Button
                        onClick={() => setShowDeletionModal(true)}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                      >
                        Delete Tenant
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Family Members Tab */}
          {activeTab === 'family' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">👨‍👩‍👧‍👦</span> Family Members
                </h2>
                <Button
                  onClick={() => setShowInviteModal(true)}
                  disabled={!canInviteMore}
                  className={!canInviteMore ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  + Invite Member
                </Button>
              </div>

              {!canInviteMore && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4">
                  Maximum of 3 family members allowed. Remove a member to invite someone new.
                </div>
              )}

              {isLoadingMembers ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {member.userName?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{member.userName || 'Unknown User'}</h3>
                          <p className="text-sm text-gray-500">{member.userEmail || 'No email'}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.role === 'owner'
                              ? 'bg-purple-100 text-purple-800'
                              : member.role === 'admin'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          Joined {new Date(member.joinedAt || member.invitedAt).toLocaleDateString()}
                        </span>
                        {member.role !== 'owner' && (
                          <Button
                            variant="danger"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No family members yet. Invite someone to get started!
                </div>
              )}
            </div>
          )}

          {/* Invite Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Invite Family Member</h3>
                <form onSubmit={handleInviteMember}>
                  <div className="space-y-4">
                    <Input
                      label="Full Name"
                      value={inviteData.name}
                      onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                      required
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      value={inviteData.email}
                      onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                      required
                    />
                    <Select
                      label="Role"
                      value={inviteData.role}
                      onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as 'admin' | 'member' })}
                      options={[
                        { value: 'member', label: 'Member - Can view and add transactions' },
                        { value: 'admin', label: 'Admin - Can manage budgets and settings' },
                      ]}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
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
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
        
        {/* Tenant Deletion Modal */}
        {showDeletionModal && tenantInfo && (
          <TenantDeletionModal
            isOpen={showDeletionModal}
            onClose={() => setShowDeletionModal(false)}
            tenantName={tenantInfo.name}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
