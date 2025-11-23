import React from 'react';
import { getInitials } from '@/utils/formatters';

interface AvatarProps {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    imageUrl?: string;
    className?: string;
}

/**
 * Avatar component with initials fallback
 */
export const Avatar: React.FC<AvatarProps> = ({
    name,
    size = 'md',
    imageUrl,
    className = '',
}) => {
    const sizeClasses = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
    };

    const initials = getInitials(name);

    // Generate consistent color based on name
    const getColorFromName = (name: string): string => {
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-indigo-500',
            'bg-red-500',
            'bg-yellow-500',
            'bg-teal-500',
        ];
        
        const hash = name.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    };

    const bgColor = getColorFromName(name);

    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
            />
        );
    }

    return (
        <div
            className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
            title={name}
        >
            {initials}
        </div>
    );
};
