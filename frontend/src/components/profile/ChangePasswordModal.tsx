import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '@/api/usersApi';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { toast } from 'react-toastify';
import { useAuthStore } from '@/store/authStore';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { user } = useAuthStore();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const { mutate: updatePassword, isPending } = useMutation({
        mutationFn: (newPassword: string) => {
            if (!user?.id) throw new Error('User not found');
            return usersApi.updateUser(user.id, { password: newPassword });
        },
        onSuccess: () => {
            toast.success('Password updated successfully');
            onClose();
            setPassword('');
            setConfirmPassword('');
            setError(null);
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to update password');
            toast.error('Failed to update password');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        updatePassword(password);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Password"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                        {error}
                    </div>
                )}

                <Input
                    label="New Password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                    }}
                    required
                    minLength={8}
                />

                <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                    }}
                    required
                    minLength={8}
                />

                <div className="flex justify-end space-x-3 mt-6">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isPending}
                    >
                        Update Password
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
