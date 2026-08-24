import React, { useState, useEffect } from "react";
import { Coins, Lock, Plus, History, X, ArrowUpRight, ArrowDownLeft, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { fetchWallet, fetchLedger, depositCoins } from "../../redux/slices/walletSlice";
import type { WalletSummary } from "../../types/contracts";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletUpdated?: (wallet: WalletSummary) => void;
  initialDepositAmount?: number;
}

export function WalletModal({ isOpen, onClose, onWalletUpdated, initialDepositAmount }: WalletModalProps) {
  const dispatch = useAppDispatch();
  const { summary: wallet, ledger, loading, depositLoading } = useAppSelector((state) => state.wallet);

  const [depositAmount, setDepositAmount] = useState<number | "">(initialDepositAmount || 500);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "deposit" | "history">("overview");

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      if (initialDepositAmount) {
        setDepositAmount(initialDepositAmount);
        setActiveTab("deposit");
      }
      setDepositSuccess(null);
      setError(null);
      dispatch(fetchWallet());
      dispatch(fetchLedger());
    }
  }, [isOpen, initialDepositAmount, dispatch]);

  useEffect(() => {
    if (wallet && onWalletUpdated) {
      onWalletUpdated(wallet);
    }
  }, [wallet, onWalletUpdated]);

  if (!isOpen) return null;

  const balanceNum = Number(wallet?.balance ?? 0);
  const lockedNum = Number(wallet?.locked_balance ?? 0);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    setError(null);
    setDepositSuccess(null);
    try {
      const resultAction = await dispatch(depositCoins(amount));
      if (depositCoins.fulfilled.match(resultAction)) {
        setDepositSuccess(`Successfully credited ₹${amount.toLocaleString("en-IN")} to your wallet!`);
        if (onWalletUpdated) onWalletUpdated(resultAction.payload);
      } else {
        setError((resultAction.payload as string) || "Deposit failed");
      }
    } catch (err: any) {
      setError(err?.message || "Deposit failed");
    }
  };

  return (
    <div
      id="wallet-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-2xl transition-all">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4 bg-[var(--surface)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[var(--ink)]">My Coin Wallet</h2>
              <p className="text-xs text-[var(--muted)]">Escrow-backed platform tokens</p>
            </div>
          </div>
          <button
            type="button"
            id="close-wallet-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--line)]/50 hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--line)] bg-[var(--surface)]/50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 py-3 px-4 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "border-emerald-500 text-emerald-500 bg-[var(--surface)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            Balance Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("deposit")}
            className={`border-b-2 py-3 px-4 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "deposit"
                ? "border-emerald-500 text-emerald-500 bg-[var(--surface)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            + Add Coins
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`border-b-2 py-3 px-4 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "history"
                ? "border-emerald-500 text-emerald-500 bg-[var(--surface)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            Ledger History
          </button>
        </div>

        {/* Success Alert */}
        {depositSuccess && (
          <div className="mx-6 mt-4 flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-500 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{depositSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="font-bold underline cursor-pointer"
            >
              View Balance
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-500 border border-rose-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-[var(--muted)]">Loading wallet details...</div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Balance Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <div className="flex items-center justify-between text-xs text-emerald-500 font-semibold mb-1">
                        <span>Available Coins</span>
                        <Coins className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="font-display text-2xl font-extrabold text-[var(--ink)]">
                        ₹{balanceNum.toLocaleString("en-IN")}
                      </div>
                      <div className="mt-1 text-[11px] text-emerald-500/80">Ready for deals & offers</div>
                    </div>

                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <div className="flex items-center justify-between text-xs text-amber-500 font-semibold mb-1">
                        <span>Locked Escrow</span>
                        <Lock className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="font-display text-2xl font-extrabold text-[var(--ink)]">
                        ₹{lockedNum.toLocaleString("en-IN")}
                      </div>
                      <div className="mt-1 text-[11px] text-amber-500/80">Held in active contracts</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[var(--surface)] p-3 text-xs text-[var(--muted)] border border-[var(--line)]">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-500" />
                      <span>All transactions logged to immutable ledger</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("deposit")}
                      className="font-bold text-emerald-500 hover:underline cursor-pointer"
                    >
                      + Top Up
                    </button>
                  </div>

                  {/* Modal Action Footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
                    <button
                      type="button"
                      id="close-wallet-overview-btn"
                      onClick={onClose}
                      className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "deposit" && (
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--ink)] mb-1.5">
                      Select or enter deposit amount (₹)
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[100, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDepositAmount(amt)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            depositAmount === amt
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                              : "bg-[var(--surface)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line)]/50"
                          }`}
                        >
                          + ₹{amt}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Custom amount"
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] p-2.5 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      id="cancel-deposit-btn"
                      onClick={onClose}
                      className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] py-3 text-xs font-bold text-[var(--ink)] hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
                    >
                      Cancel / Close
                    </button>
                    <button
                      type="submit"
                      id="confirm-deposit-btn"
                      disabled={depositLoading || !depositAmount}
                      className="flex-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                    >
                      {depositLoading ? "Processing Deposit..." : `Deposit ₹${depositAmount || 0} to Wallet`}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "history" && (
                <div className="space-y-3">
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {ledger.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[var(--muted)]">No transaction records found.</div>
                    ) : (
                      ledger.map((entry) => {
                        const amount = Number(entry.amount);
                        const isCredit = ["deposit", "escrow_release_security", "escrow_payout_fee"].includes(entry.entry_type);
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-xl bg-[var(--surface)] p-3 border border-[var(--line)] text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                  isCredit ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
                                }`}
                              >
                                {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                              </div>
                              <div>
                                <div className="font-bold text-[var(--ink)]">
                                  {entry.description || entry.entry_type}
                                </div>
                                <div className="text-[10px] text-[var(--muted)]">
                                  {new Date(entry.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className={`font-mono font-bold ${isCredit ? "text-emerald-500" : "text-[var(--ink)]"}`}>
                              {isCredit ? "+" : "-"}₹{amount.toFixed(2)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex justify-end pt-2 border-t border-[var(--line)]">
                    <button
                      type="button"
                      id="close-wallet-history-btn"
                      onClick={onClose}
                      className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
