import React, { useState, useEffect, useCallback } from "react";
import { Coins, Lock, Plus, History, X, ArrowUpRight, ArrowDownLeft, Shield, AlertCircle } from "lucide-react";
import api from "../../services/api";
import type { WalletSummary } from "../../types/contracts";

interface LedgerEntry {
  id: string;
  amount: number | string;
  entry_type: string;
  description: string | null;
  created_at: string;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletUpdated?: (wallet: WalletSummary) => void;
}

export function WalletModal({ isOpen, onClose, onWalletUpdated }: WalletModalProps) {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState<number | "">(500);
  const [depositLoading, setDepositLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "deposit" | "history">("overview");

  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [walletRes, ledgerRes] = await Promise.all([
        api.get<any, WalletSummary>("/api/wallet"),
        api.get<any, LedgerEntry[]>("/api/wallet/ledger").catch(() => []),
      ]);

      setWallet(walletRes);
      if (onWalletUpdated) onWalletUpdated(walletRes);

      setLedger(Array.isArray(ledgerRes) ? ledgerRes : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  }, [onWalletUpdated]);

  useEffect(() => {
    if (isOpen) {
      fetchWalletData();
    }
  }, [isOpen, fetchWalletData]);

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

    setDepositLoading(true);
    setError(null);
    try {
      const updated = await api.post<any, WalletSummary>("/api/wallet/deposit", { amount });
      setWallet(updated);
      if (onWalletUpdated) onWalletUpdated(updated);
      setActiveTab("overview");
      fetchWalletData();
    } catch (err: any) {
      setError(err?.message || "Deposit failed");
    } finally {
      setDepositLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[#1A1A1A]">My Coin Wallet</h2>
              <p className="text-xs text-gray-500">Escrow-backed platform tokens</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--line)] bg-gray-50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 py-3 px-4 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "border-emerald-500 text-emerald-700 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Balance Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("deposit")}
            className={`border-b-2 py-3 px-4 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "deposit"
                ? "border-emerald-500 text-emerald-700 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            + Add Coins
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`border-b-2 py-3 px-4 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "history"
                ? "border-emerald-500 text-emerald-700 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Ledger History
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading wallet details...</div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Balance Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mb-1">
                        <span>Available Coins</span>
                        <Coins className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="font-display text-2xl font-extrabold text-[#1A1A1A]">
                        ₹{balanceNum.toLocaleString("en-IN")}
                      </div>
                      <div className="mt-1 text-[11px] text-emerald-600">Ready for deals & offers</div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                      <div className="flex items-center justify-between text-xs text-amber-700 font-semibold mb-1">
                        <span>Locked Escrow</span>
                        <Lock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="font-display text-2xl font-extrabold text-[#1A1A1A]">
                        ₹{lockedNum.toLocaleString("en-IN")}
                      </div>
                      <div className="mt-1 text-[11px] text-amber-600">Held in active contracts</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-xs text-gray-600 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <span>All transactions logged to immutable ledger</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("deposit")}
                      className="font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      + Top Up
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "deposit" && (
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
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
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
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
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={depositLoading || !depositAmount}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                  >
                    {depositLoading ? "Processing Deposit..." : `Deposit ₹${depositAmount || 0} to Wallet`}
                  </button>
                </form>
              )}

              {activeTab === "history" && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {ledger.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">No transaction records found.</div>
                  ) : (
                    ledger.map((entry) => {
                      const amount = Number(entry.amount);
                      const isCredit = ["deposit", "escrow_release_security", "escrow_payout_fee"].includes(entry.entry_type);
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-xl bg-gray-50 p-3 border border-gray-100 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                isCredit ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-bold text-[#1A1A1A]">
                                {entry.description || entry.entry_type}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {new Date(entry.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className={`font-mono font-bold ${isCredit ? "text-emerald-600" : "text-gray-700"}`}>
                            {isCredit ? "+" : "-"}₹{amount.toFixed(2)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
