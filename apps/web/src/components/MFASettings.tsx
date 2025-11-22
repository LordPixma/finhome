'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui';
import { api } from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheckIcon,
  KeyIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface MFAStatus {
  isEnabled: boolean;
  backupCodesRemaining: number;
}

interface MFASetupData {
  qrCodeURL: string;
  secret: string;
  backupCodes: string[];
}

interface TrustedDevice {
  id: string;
  deviceName: string;
  ipAddress: string;
  lastUsedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

export function MFASettings() {
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Recovery Email state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Trusted Devices state
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    loadMFAStatus();
    if (status?.isEnabled) {
      loadTrustedDevices();
    }
  }, [status?.isEnabled]);

  const loadMFAStatus = async () => {
    try {
      setIsLoading(true);
      const response = await api.mfa.getStatus() as any;
      if (response.success) {
        setStatus(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load MFA status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupMFA = async () => {
    try {
      setIsProcessing(true);
      setError('');
      const response = await api.mfa.setup() as any;
      if (response.success) {
        setSetupData(response.data);
        setShowSetupModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to setup MFA');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || !verificationCode) return;

    try {
      setIsProcessing(true);
      setError('');
      const response = await api.mfa.confirm(verificationCode, setupData.secret) as any;
      if (response.success) {
        setSuccess('MFA enabled successfully!');
        setShowSetupModal(false);
        setVerificationCode('');
        await loadMFAStatus();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode) return;

    try {
      setIsProcessing(true);
      setError('');
      const response = await api.mfa.disable(disableCode) as any;
      if (response.success) {
        setSuccess('MFA disabled successfully');
        setShowDisableModal(false);
        setDisableCode('');
        await loadMFAStatus();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      setIsProcessing(true);
      setError('');
      const response = await api.mfa.regenerateBackupCodes() as any;
      if (response.success) {
        setBackupCodes(response.data.backupCodes);
        setShowBackupCodesModal(true);
        await loadMFAStatus();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate backup codes');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyBackupCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const downloadBackupCodes = (codes: string[]) => {
    const text = codes.join('\n');
    const blob = new Blob([`Finhome360 MFA Backup Codes\n\n${text}\n\nKeep these codes safe! Each code can only be used once.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finhome-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadTrustedDevices = async () => {
    try {
      setLoadingDevices(true);
      const response = await api.mfa.getTrustedDevices() as any;
      if (response.success) {
        setTrustedDevices(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load trusted devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      setError('');
      const response = await api.mfa.removeTrustedDevice(deviceId) as any;
      if (response.success) {
        setSuccess('Device removed successfully');
        await loadTrustedDevices();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove device');
    }
  };

  const handleSetRecoveryEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;

    try {
      setIsUpdatingEmail(true);
      setError('');
      const response = await api.mfa.setRecoveryEmail(recoveryEmail) as any;
      if (response.success) {
        setSuccess('Recovery email updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set recovery email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleSendBackupCodes = async () => {
    try {
      setIsProcessing(true);
      setError('');
      const response = await api.mfa.sendBackupCodes() as any;
      if (response.success) {
        setSuccess(response.data.message || 'Backup codes sent to recovery email');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send backup codes');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircleIcon className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* MFA Status Card */}
      <div className={`rounded-xl border-2 p-6 ${status?.isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${status?.isEnabled ? 'bg-green-100' : 'bg-gray-200'}`}>
              <ShieldCheckIcon className={`h-6 w-6 ${status?.isEnabled ? 'text-green-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mt-1">
                {status?.isEnabled
                  ? 'Your account is protected with 2FA'
                  : 'Add an extra layer of security to your account'}
              </p>
              {status?.isEnabled && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <KeyIcon className="h-4 w-4" />
                  <span>{status.backupCodesRemaining} backup codes remaining</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {status?.isEnabled ? (
              <>
                <Button
                  onClick={handleRegenerateBackupCodes}
                  variant="secondary"
                  disabled={isProcessing}
                  className="text-sm"
                >
                  Regenerate Codes
                </Button>
                <Button
                  onClick={() => setShowDisableModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 text-sm"
                >
                  Disable
                </Button>
              </>
            ) : (
              <Button onClick={handleSetupMFA} disabled={isProcessing}>
                Enable 2FA
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            How it works
          </h4>
          <p className="text-sm text-blue-800">
            Two-factor authentication uses an app on your phone to generate one-time codes.
            We recommend Google Authenticator or Authy.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <KeyIcon className="h-5 w-5" />
            Backup codes
          </h4>
          <p className="text-sm text-amber-800">
            Save your backup codes in a secure location. You can use them to access your account if you lose your phone.
          </p>
        </div>
      </div>

      {/* Recovery Email Section - Only show if MFA is enabled */}
      {status?.isEnabled && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recovery Email</h3>
          <p className="text-sm text-gray-600 mb-4">
            Set a recovery email to receive backup codes if you lose access to your authenticator app.
          </p>

          <form onSubmit={handleSetRecoveryEmail} className="flex gap-3">
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="recovery@example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <Button type="submit" disabled={isUpdatingEmail || !recoveryEmail}>
              {isUpdatingEmail ? 'Saving...' : 'Save Email'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSendBackupCodes}
              disabled={isProcessing || !recoveryEmail}
            >
              Send Codes
            </Button>
          </form>
        </div>
      )}

      {/* Trusted Devices Section - Only show if MFA is enabled */}
      {status?.isEnabled && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Trusted Devices</h3>
              <p className="text-sm text-gray-600 mt-1">
                Devices that are trusted for 30 days and don't require MFA verification
              </p>
            </div>
          </div>

          {loadingDevices ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : trustedDevices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No trusted devices yet</p>
              <p className="text-sm mt-2">Check "Remember this device" when logging in to add a device</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trustedDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{device.deviceName}</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Trusted</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      <span>IP: {device.ipAddress}</span>
                      <span className="mx-2">•</span>
                      <span>Last used: {new Date(device.lastUsedAt).toLocaleDateString()}</span>
                      <span className="mx-2">•</span>
                      <span>Expires: {new Date(device.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRemoveDevice(device.id)}
                    variant="secondary"
                    className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 text-sm"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Setup Modal */}
      {showSetupModal && setupData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Set up Two-Factor Authentication</h3>

            <div className="space-y-6">
              {/* Step 1 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                  <h4 className="text-lg font-semibold text-gray-900">Scan QR Code</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4 ml-10">
                  Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code:
                </p>
                <div className="ml-10 bg-white p-6 rounded-lg border-2 border-gray-200 inline-block">
                  <QRCodeSVG value={setupData.qrCodeURL} size={200} level="H" />
                </div>
                <div className="ml-10 mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Manual entry code:</p>
                  <code className="text-sm font-mono text-gray-900 break-all">{setupData.secret}</code>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                  <h4 className="text-lg font-semibold text-gray-900">Save Backup Codes</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3 ml-10">
                  Save these backup codes in a secure location. Each code can only be used once.
                </p>
                <div className="ml-10 bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {setupData.backupCodes.map((code, index) => (
                      <code key={index} className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-300">
                        {code}
                      </code>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => downloadBackupCodes(setupData.backupCodes)}
                      className="text-sm"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
                        alert('Backup codes copied to clipboard!');
                      }}
                      className="text-sm"
                    >
                      Copy All
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <form onSubmit={handleConfirmMFA}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">3</div>
                  <h4 className="text-lg font-semibold text-gray-900">Verify</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3 ml-10">
                  Enter the 6-digit code from your authenticator app to complete setup:
                </p>
                <div className="ml-10 space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-2xl font-mono tracking-widest w-48 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={isProcessing || verificationCode.length !== 6}
                    >
                      {isProcessing ? 'Verifying...' : 'Enable 2FA'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowSetupModal(false);
                        setVerificationCode('');
                        setError('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Disable Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Disable Two-Factor Authentication</h3>
            <p className="text-sm text-gray-600 mb-6">
              Enter a verification code from your authenticator app to disable 2FA:
            </p>

            <form onSubmit={handleDisableMFA} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isProcessing || disableCode.length !== 6}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                >
                  {isProcessing ? 'Processing...' : 'Disable 2FA'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowDisableModal(false);
                    setDisableCode('');
                    setError('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodesModal && backupCodes.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">New Backup Codes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Save these new backup codes. Your old codes will no longer work.
            </p>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code key={index} className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-300">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => downloadBackupCodes(backupCodes)}
                className="flex-1"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={copyBackupCodes}
                className="flex-1"
              >
                {copiedCodes ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  'Copy All'
                )}
              </Button>
            </div>

            <Button
              onClick={() => {
                setShowBackupCodesModal(false);
                setBackupCodes([]);
              }}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
