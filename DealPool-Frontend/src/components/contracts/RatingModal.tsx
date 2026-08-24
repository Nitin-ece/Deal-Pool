import React, { useState } from "react";
import { Star, X, Sparkles, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import api from "../../services/api";
import { getErrorMessage } from "../../lib/errors";
import { toast } from "sonner";

interface RatingModalProps {
  contractId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  counterpartName?: string;
}

const STAR_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Fair Experience",
  3: "Good & Reliable",
  4: "Great Experience",
  5: "Exceptional & Highly Recommended",
};

const QUICK_FEEDBACK_TAGS = [
  "Punctual & Responsive",
  "Item in Mint Condition",
  "Smooth QR Handover",
  "Clear Communication",
  "Careful with Gear",
  "Super Friendly Neighbor",
];

export function RatingModal({
  contractId,
  isOpen,
  onClose,
  onSuccess,
  counterpartName = "neighbor",
}: RatingModalProps) {
  const [score, setScore] = useState<number>(5);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!score || score < 1 || score > 5) {
      setError("Please select a star rating from 1 to 5.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const fullReview = [
        review.trim(),
        selectedTags.length > 0 ? `Tags: ${selectedTags.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      await api.post(`/api/contracts/${contractId}/rate`, {
        score,
        review: fullReview || undefined,
      });

      setSubmitted(true);
      toast.success("Rating and feedback recorded!");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1400);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to submit rating."));
    } finally {
      setSubmitting(false);
    }
  };

  const activeScore = hoverScore || score;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[var(--ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-black text-base text-[var(--ink)]">Rate Exchange Experience</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-full hover:bg-[var(--line)]/40 text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-black text-lg text-[var(--ink)]">Thank you for rating!</h4>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Your feedback builds trust and updates community reputation for {counterpartName}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <p className="text-xs text-[var(--muted)]">
                How was your experience with <strong className="text-[var(--ink)]">{counterpartName}</strong>?
              </p>

              {/* Star Rating Interactive Selector */}
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverScore(star)}
                    onMouseLeave={() => setHoverScore(null)}
                    onClick={() => setScore(star)}
                    className="p-1 rounded-xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= activeScore
                          ? "fill-amber-400 text-amber-500"
                          : "text-[var(--line)] hover:text-amber-300"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="text-xs font-bold text-amber-500 h-4">
                {STAR_LABELS[activeScore] || "Select Rating"}
              </div>
            </div>

            {/* Quick Feedback Chips */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
                Quick Highlights
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_FEEDBACK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-500 scale-105"
                          : "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Written Review */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Written Note (Optional)</span>
              </label>
              <textarea
                rows={3}
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share any helpful details for the neighborhood..."
                className="w-full p-3 bg-[var(--paper)] text-[var(--ink)] rounded-2xl text-xs border border-[var(--line)] focus:outline-none focus:bg-[var(--surface)] focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-[var(--muted)] leading-relaxed"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{submitting ? "Submitting..." : "Submit Review"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
