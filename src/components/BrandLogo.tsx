import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface BrandLogoProps {
  customLogoUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  onLogoChange?: (url: string) => void;
  allowUploadDirectly?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  customLogoUrl,
  className = '',
  size = 'md',
  showSubtitle = true,
  onLogoChange,
  allowUploadDirectly = true
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl && onLogoChange) {
        onLogoChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (allowUploadDirectly) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!allowUploadDirectly) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  // If user has their actual company logo uploaded/configured
  if (customLogoUrl) {
    return (
      <div 
        className={`relative group flex items-center gap-3 ${className}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="relative flex items-center">
          <img
            src={customLogoUrl}
            alt="GINI Company Logo"
            className={`object-contain ${
              size === 'sm' 
                ? 'h-8 max-w-[140px]' 
                : size === 'lg' 
                ? 'h-14 max-w-[240px]' 
                : 'h-10 max-w-[180px]'
            } transition-opacity group-hover:opacity-90`}
            referrerPolicy="no-referrer"
          />

          {allowUploadDirectly && onLogoChange && (
            <div className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Change company logo file"
                className="p-1 bg-white text-red-600 rounded-full shadow-md border border-red-200 hover:bg-red-50 text-[10px]"
              >
                <Upload className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onLogoChange('')}
                title="Remove custom logo"
                className="p-1 bg-white text-slate-500 rounded-full shadow-md border border-slate-200 hover:bg-slate-100 text-[10px]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {showSubtitle && (
          <div className="hidden sm:block">
            <span className="text-[11px] font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded-full border border-red-200/80">
              7-Stage Campaigns
            </span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // Pure Red & White company wordmark and upload trigger (NO fake generated icons)
  return (
    <div 
      className={`flex items-center gap-3 select-none ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Red & White Corporate Lettermark */}
      <div 
        onClick={() => allowUploadDirectly && fileInputRef.current?.click()}
        className={`relative cursor-pointer group flex items-center justify-center rounded-xl bg-red-600 text-white font-black tracking-wider shadow-xs hover:bg-red-700 transition-all border border-red-700 ${
          isDragging ? 'ring-2 ring-red-500 ring-offset-2 scale-105' : ''
        } ${
          size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
        }`}
        title="Click or drag & drop to upload your company logo file"
      >
        <span>GINI</span>

        {/* Hover upload overlay */}
        {allowUploadDirectly && (
          <div className="absolute inset-0 bg-red-800/90 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Upload className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Brand Title & Subtitle in Red & White Theme */}
      <div>
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold tracking-tight text-red-600">
              GINI
            </span>
            <span className="text-xs text-slate-400 font-medium">·</span>
            <span className="text-base font-bold text-slate-900 tracking-tight">
              Outreach Flow
            </span>
          </div>

          <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded-full border border-red-200/80">
            7-Stage Sequences
          </span>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
            Multi-Stage Outreach & Campaign Engine
          </p>

          {allowUploadDirectly && onLogoChange && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] font-semibold text-red-600 hover:text-red-700 underline flex items-center gap-1"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Upload company logo</span>
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
