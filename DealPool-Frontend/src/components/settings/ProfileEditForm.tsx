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
      className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-xs space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[var(--ink)] text-base">Profile Information</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Update your public persona and contact email.
          </p>
        </div>

        {/* Read-Only Role & Rating Indicators */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Shield className="w-3.5 h-3.5" />
            <span className="capitalize">{user.role}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>{Number(user.avg_rating || 0).toFixed(1)}</span>
            <span className="text-[var(--muted)] font-normal">({user.rating_count})</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Username */}
        <div>
          <label className="block text-xs font-bold text-[var(--ink)] mb-1.5">Username</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              id="edit-username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--paper)] rounded-xl text-sm font-medium text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--signal)] transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-[var(--ink)] mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              id="edit-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--paper)] rounded-xl text-sm font-medium text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--signal)] transition-all"
            />
          </div>
        </div>

        {/* Profile Photo URL */}
        <div>
          <label className="block text-xs font-bold text-[var(--ink)] mb-1.5">
            Profile Photo Image URL
          </label>
          <div className="relative">
            <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              id="edit-photo-input"
              type="url"
              value={profilePhoto}
              onChange={(e) => setProfilePhoto(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--paper)] rounded-xl text-sm font-medium text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--signal)] transition-all placeholder:text-[var(--muted)]"
            />
          </div>
          {profilePhoto && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={profilePhoto}
                alt="Preview"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-[var(--line)] shadow-xs"
              />
              <span className="text-xs text-[var(--muted)]">Avatar Preview</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          id="save-profile-btn"
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? "Saving Changes..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}

