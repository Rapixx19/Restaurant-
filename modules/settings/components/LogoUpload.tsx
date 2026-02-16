'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface LogoUploadProps {
  restaurantId: string;
  userId: string;
  currentLogoUrl?: string | null;
  onUploadComplete?: (url: string) => void;
}

/**
 * Logo upload component with Supabase Storage integration.
 * Uploads to: restaurant-assets/{user_id}/logo-{timestamp}.png
 */
export function LogoUpload({
  restaurantId,
  userId,
  currentLogoUrl,
  onUploadComplete,
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const supabase = createClient();

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('restaurant-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('restaurant-assets')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update restaurant record with image_url
      // Note: Using 'as any' because image_url may not be in generated types yet
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ image_url: publicUrl } as Record<string, unknown>)
        .eq('id', restaurantId);

      if (updateError) {
        throw updateError;
      }

      // Update preview
      setPreview(publicUrl);
      onUploadComplete?.(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Update restaurant to remove image_url
      // Note: Using 'as any' because image_url may not be in generated types yet
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ image_url: null } as Record<string, unknown>)
        .eq('id', restaurantId);

      if (updateError) {
        throw updateError;
      }

      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Remove error:', err);
      setError('Failed to remove image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-6">
        {/* Preview */}
        <div
          className={cn(
            'relative w-24 h-24 rounded-xl overflow-hidden',
            'bg-white/5 border border-white/10',
            'flex items-center justify-center'
          )}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="Restaurant logo"
                className="w-full h-full object-cover"
              />
              {!uploading && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className={cn(
                    'absolute top-1 right-1',
                    'w-6 h-6 rounded-full',
                    'bg-red-500/80 hover:bg-red-500',
                    'flex items-center justify-center',
                    'transition-colors'
                  )}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </>
          ) : (
            <ImageIcon className="w-8 h-8 text-gray-500" />
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Upload controls */}
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex items-center gap-2',
              'px-4 py-2 rounded-lg',
              'bg-white/5 border border-white/10',
              'text-white font-medium',
              'hover:bg-white/10 hover:border-white/20',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Upload className="w-4 h-4" />
            {preview ? 'Change Logo' : 'Upload Logo'}
          </button>

          <p className="text-xs text-gray-500">
            PNG, JPG, or GIF. Max 5MB. Recommended: 200x200px
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
