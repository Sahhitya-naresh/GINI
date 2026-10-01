import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

const DEFAULT_GINI_IRIS_LOGO = '/gini-iris-logo.png';

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
  onLogoChange,
  allowUploadDirectly = true
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const activeLogo = customLogoUrl || DEFAULT_GINI_IRIS_LOGO;

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

  return (
    <div 
      className={`relative group flex items-center gap-3 select-none ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="relative flex items-center">
        <img
          src={activeLogo}
          alt="gini iris"
          className={`object-contain transition-opacity group-hover:opacity-95 ${
            size === 'sm' 
              ? 'h-9 max-w-[130px]' 
              : size === 'lg' 
              ? 'h-14 max-w-[220px]' 
              : 'h-11 sm:h-12 max-w-[190px]'
          } ${isDragging ? 'ring-2 ring-red-500 rounded p-1' : ''}`}
          referrerPolicy="no-referrer"
        />

        {allowUploadDirectly && onLogoChange && (
          <div className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Change company logo file"
              className="p-1 bg-white text-red-600 rounded-full shadow-md border border-red-200 hover:bg-red-50 text-[10px] cursor-pointer"
            >
              <Upload className="w-3 h-3" />
            </button>
            {customLogoUrl && (
              <button
                type="button"
                onClick={() => onLogoChange('')}
                title="Reset to default gini iris logo"
                className="p-1 bg-white text-slate-500 rounded-full shadow-md border border-slate-200 hover:bg-slate-100 text-[10px] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
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
