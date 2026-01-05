'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import type { User } from '@/lib/auth';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdate: (user: User) => void;
}

export function EditProfileModal({ isOpen, onClose, user, onUpdate }: EditProfileModalProps) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isNeumorphic = theme === 'neumorphic';

  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setError(null);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const { data, error: apiError } = await api.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
      });

      if (apiError) {
        setError(apiError.message);
        return;
      }

      if (data?.user) {
        onUpdate(data.user);
        showToast('Profile updated successfully!', 'success');
        onClose();
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = cn(
    'w-full px-4 py-3 rounded-xl transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-vibe-purple/50',
    isNeumorphic
      ? 'bg-neumorphic-dark text-neumorphic-text shadow-neu-inset'
      : 'bg-white/10 text-white border border-white/20 placeholder:text-white/40'
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <GlassPanel className="w-full max-w-md" padding="lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className={cn(
                  'text-xl font-bold',
                  isNeumorphic ? 'text-neumorphic-text' : 'text-white'
                )}>
                  Edit Profile
                </h2>
                <button
                  onClick={onClose}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isNeumorphic
                      ? 'hover:bg-neumorphic-dark/20 text-neumorphic-text'
                      : 'hover:bg-white/10 text-white/60'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={cn(
                    'block text-sm font-medium mb-2',
                    isNeumorphic ? 'text-neumorphic-text' : 'text-white/80'
                  )}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    maxLength={100}
                    className={inputClasses}
                  />
                  <p className={cn(
                    'text-xs mt-1',
                    isNeumorphic ? 'text-neumorphic-muted' : 'text-white/40'
                  )}>
                    {displayName.length}/100 characters
                  </p>
                </div>

                <div>
                  <label className={cn(
                    'block text-sm font-medium mb-2',
                    isNeumorphic ? 'text-neumorphic-text' : 'text-white/80'
                  )}>
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                    rows={4}
                    className={cn(inputClasses, 'resize-none')}
                  />
                  <p className={cn(
                    'text-xs mt-1',
                    isNeumorphic ? 'text-neumorphic-muted' : 'text-white/40'
                  )}>
                    {bio.length}/500 characters
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    isLoading={isSaving}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
