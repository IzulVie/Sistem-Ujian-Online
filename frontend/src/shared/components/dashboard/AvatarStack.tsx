import React from 'react';

export interface AvatarItem {
  id: string | number;
  name: string;
  avatarUrl?: string;
}

interface AvatarStackProps {
  avatars: AvatarItem[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px] ring-1',
  md: 'h-8 w-8 text-xs ring-2',
  lg: 'h-10 w-10 text-sm ring-2'
};

const bgColors = [
  'bg-indigo-600/40 text-indigo-200 border-indigo-500/40',
  'bg-cyan-600/40 text-cyan-200 border-cyan-500/40',
  'bg-emerald-600/40 text-emerald-200 border-emerald-500/40',
  'bg-amber-600/40 text-amber-200 border-amber-500/40',
  'bg-purple-600/40 text-purple-200 border-purple-500/40'
];

export const AvatarStack: React.FC<AvatarStackProps> = ({
  avatars = [],
  max = 3,
  size = 'md',
  className = ''
}) => {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;
  const sClass = sizeClasses[size];

  return (
    <div className={`flex items-center -space-x-2 overflow-hidden ${className}`}>
      {visible.map((av, index) => {
        const initial = av.name ? av.name.charAt(0).toUpperCase() : '?';
        const color = bgColors[index % bgColors.length];

        return (
          <div
            key={av.id || index}
            title={av.name}
            className={`relative inline-flex items-center justify-center rounded-full ring-[#070a13] font-bold uppercase transition hover:z-10 hover:scale-110 ${sClass} ${color} border`}
          >
            {av.avatarUrl ? (
              <img src={av.avatarUrl} alt={av.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
        );
      })}

      {remaining > 0 && (
        <div
          title={`${remaining} peserta lainnya`}
          className={`relative inline-flex items-center justify-center rounded-full ring-[#070a13] bg-white/10 text-gray-300 font-bold border border-white/20 ${sClass}`}
        >
          <span>+{remaining}</span>
        </div>
      )}
    </div>
  );
};
