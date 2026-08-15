import React, { useState } from "react";
import { UserProfile } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errors";
import { User, Mail, Image as ImageIcon, CheckCircle2, AlertCircle, Shield, Star } from "lucide-react";

interface ProfileEditFormProps {
  user: UserProfile;
}

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const { updateProfile } = useAuth();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [profilePhoto, setProfilePhoto] = useState(user.profile_photo || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload: { username?: string; email?: string; profile_photo?: string | null } = {};
      if (username !== user.username) payload.username = username;
      if (email !== user.email) payload.email = email;
      if (profilePhoto !== (user.profile_photo || "")) payload.profile_photo = profilePhoto || null;

      if (Object.keys(payload).length === 0) {
        setError("No changes made to update.");
        setLoading(false);
        return;
      }

      await updateProfile(payload).unwrap();
      setSuccess(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update profile."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      id="profile-edit-form"
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl p-6 border border-[#E5E5E2] shadow-xs space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[#1A1A1A] text-base">Profile Information</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Update your public persona and contact email.
          </p>
        </div>

        {/* Read-Only Role & Rating Indicators */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#059669] border border-emerald-100">
            <Shield className="w-3.5 h-3.5" />
            <span className="capitalize">{user.role}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>{Number(user.avg_rating || 0).toFixed(1)}</span>
            <span className="text-gray-400 font-normal">({user.rating_count})</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-xs text-[#059669] bg-[#F0FDF4] p-3 rounded-xl border border-[#10B981]/30">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Username */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Username</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="edit-username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-[#1A1A1A] border border-[#E5E5E2] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10B981] transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="edit-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-[#1A1A1A] border border-[#E5E5E2] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10B981] transition-all"
            />
          </div>
        </div>

        {/* Profile Photo URL */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Profile Photo Image URL
          </label>
          <div className="relative">
            <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="edit-photo-input"
              type="url"
              value={profilePhoto}
              onChange={(e) => setProfilePhoto(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-[#1A1A1A] border border-[#E5E5E2] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10B981] transition-all placeholder:text-gray-400"
            />
          </div>
          {profilePhoto && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={profilePhoto}
                alt="Preview"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-[#E5E5E2] shadow-xs"
              />
              <span className="text-xs text-gray-500">Avatar Preview</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          id="save-profile-btn"
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? "Saving Changes..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}

