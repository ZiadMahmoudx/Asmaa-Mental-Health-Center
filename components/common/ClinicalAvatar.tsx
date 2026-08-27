"use client";

import React, { useState } from "react";
import { User, Stethoscope, Heart } from "lucide-react";

interface ClinicalAvatarProps {
  src?: string;
  alt: string;
  name: string;
  className?: string;
  badgeIcon?: React.ReactNode;
  isDoctor?: boolean;
}

export const ClinicalAvatar: React.FC<ClinicalAvatarProps> = ({
  src,
  alt,
  name,
  className = "w-16 h-16 rounded-2xl",
  badgeIcon,
  isDoctor = false,
}) => {
  const [imgError, setImgError] = useState(false);

  // Generate initials
  const initials = name
    ? name
        .replace(/^(د\. |أ\. |Dr\. |Prof\. )/, "")
        .trim()
        .slice(0, 2)
    : "أ";

  return (
    <div className={`relative inline-block ${className} flex-shrink-0`}>
      {!imgError && src ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-inherit"
          style={{ borderRadius: "inherit" }}
        />
      ) : (
        <div
          className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-teal-800 to-teal-950 text-white font-black text-sm shadow-inner"
          style={{ borderRadius: "inherit" }}
        >
          {isDoctor ? (
            <div className="flex flex-col items-center justify-center">
              <Stethoscope className="w-5 h-5 text-sage-300 mb-0.5 opacity-80" />
              <span className="text-[11px] font-bold tracking-tight">{initials}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <User className="w-5 h-5 text-sage-300 mb-0.5 opacity-80" />
              <span className="text-[11px] font-bold">{initials}</span>
            </div>
          )}
        </div>
      )}

      {badgeIcon && (
        <div className="absolute -bottom-1 -right-1 z-10">
          {badgeIcon}
        </div>
      )}
    </div>
  );
};
