import React, { useState } from "react";
import { useAppDispatch } from "../../redux/store";
import { createOffer } from "../../redux/slices/offersSlice";
import { Send, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface MakeOfferFormProps {
  dealId: string;
  suggestedBudgetMin: number;
  suggestedBudgetMax: number;
  onSuccess?: () => void;
}

export function MakeOfferForm({
  dealId,
  suggestedBudgetMin,
  suggestedBudgetMax,
  onSuccess,
}: MakeOfferFormProps) {
  const dispatch = useAppDispatch();
  const [price, setPrice] = useState<number | string>(suggestedBudgetMin || 500);
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || Number(price) <= 0) {
      setError("Please enter a valid price for your offer.");
      return;
    }
    if (!terms.trim() || terms.trim().length < 5) {
      setError("Please outline your terms, equipment details, or availability (min 5 characters).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await dispatch(
        createOffer({
          dealId,
          price: Number(price),
          terms: terms.trim(),
        })
      ).unwrap();

      setSuccess(true);
      setTerms("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err || "Failed to submit offer.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-[var(--ink)] text-sm">Offer Submitted Successfully!</h4>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          The deal creator has been notified of your proposal and terms.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="text-xs font-semibold text-emerald-500 hover:underline cursor-pointer"
        >
          Submit another proposal
        </button>
      </div>
    );
  }

  return (
    <form
      id="make-offer-form"
      onSubmit={handleSubmit}
      className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--signal)]" />
          <h3 className="font-bold text-[var(--ink)] text-sm">Make an Offer</h3>
        </div>
        <span className="text-[11px] text-[var(--muted)] font-medium">
          Target: ₹{suggestedBudgetMin} - ₹{suggestedBudgetMax}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-[var(--ink)] mb-1.5">
          Your Proposed Price (₹)
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold text-sm">
            ₹
          </span>
          <input
            id="offer-price-input"
            type="number"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Enter price"
            required
            className="w-full pl-8 pr-4 py-2.5 bg-[var(--paper)] rounded-xl text-sm font-semibold text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--signal)] transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-[var(--ink)] mb-1.5">
          Proposal Terms & Availability
        </label>
        <textarea
          id="offer-terms-input"
          rows={3}
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="Describe your offer terms, equipment specifications, and handover availability..."
          required
          className="w-full px-3.5 py-2.5 bg-[var(--paper)] rounded-xl text-xs sm:text-sm text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--signal)] transition-all placeholder:text-[var(--muted)] leading-relaxed"
        ></textarea>
      </div>

      <button
        id="submit-offer-btn"
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        <span>{loading ? "Submitting..." : "Send Proposal"}</span>
      </button>
    </form>
  );
}

