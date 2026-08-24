import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { fetchAllDeals } from "../redux/slices/dealsSlice";
import { useAuth } from "../hooks/useAuth";
import { CategoryBadge } from "../components/common/CategoryBadge";
import { StatusBadge } from "../components/common/StatusBadge";
import api from "../services/api";
import { Offer } from "../types";
import {
  FolderHeart,
  Send,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  MapPin,
} from "lucide-react";

import { DEFAULT_CATEGORY_IMAGES } from "../lib/categoryImages";

export function MyDeals() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { allDeals, loading } = useAppSelector((state) => state.deals);

  const [activeTab, setActiveTab] = useState<"posted" | "offers">("posted");
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    dispatch(fetchAllDeals({ userId: user.id }));

    // Fetch user's submitted offers
    const fetchUserOffers = async () => {
      setOffersLoading(true);
      try {
        const res = await api.get<any, Offer[]>("/api/offers/my");
        setMyOffers(res || []);
      } catch {
        setMyOffers([]);
      } finally {
        setOffersLoading(false);
      }
    };
    fetchUserOffers();
  }, [dispatch, user]);

  const userDeals = allDeals.filter((d) => d.user_id === user?.id);

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--signal)]/10 text-[var(--signal)] text-xs font-bold border border-[var(--signal)]/20 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[var(--signal)]" />
            <span>Activity Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight">
            My Needs & Outgoing Proposals
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5 font-normal">
            Track active requests you've broadcasted and monitor status of your outgoing proposals.
          </p>
        </div>

        <Link
          to="/deals/new"
          className="px-5 py-2.5 rounded-xl bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Post a Need</span>
        </Link>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[var(--line)] gap-6">
        <button
          onClick={() => setActiveTab("posted")}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "posted"
              ? "border-[var(--signal)] text-[var(--signal)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          <FolderHeart className="w-4 h-4" />
          <span>Needs I Posted ({userDeals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("offers")}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "offers"
              ? "border-[var(--signal)] text-[var(--signal)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Offers I've Made ({myOffers.length})</span>
        </button>
      </div>

      {/* Tab Content: Needs I Posted */}
      {activeTab === "posted" && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-xs text-[var(--muted)] font-semibold">
              Loading your posted needs...
            </div>
          ) : userDeals.length === 0 ? (
            <div className="text-center py-16 bg-[var(--surface)] rounded-3xl border border-[var(--line)] p-8 space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[var(--signal)]/10 text-[var(--signal)] flex items-center justify-center mx-auto">
                <FolderHeart className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[var(--ink)] text-base">No needs posted yet</h3>
              <p className="text-xs text-[var(--muted)] max-w-sm mx-auto font-normal">
                Have an event, DIY project, or need tools? Broadcast a request to your neighborhood radar.
              </p>
              <div className="pt-2">
                <Link
                  to="/deals/new"
                  className="px-5 py-2.5 rounded-xl bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post Your First Need</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {userDeals.map((deal) => {
                const img = deal.image_url || DEFAULT_CATEGORY_IMAGES[deal.category] || DEFAULT_CATEGORY_IMAGES["Other"];
                return (
                  <div
                    key={deal.id}
                    onClick={() => navigate(`/deals/${deal.id}`)}
                    className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--line)] shadow-xs hover:border-[var(--signal)] transition-all flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="relative h-36 w-full overflow-hidden bg-[var(--paper)]">
                      <img
                        src={img}
                        alt={deal.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3">
                        <CategoryBadge category={deal.category} />
                      </div>
                      <div className="absolute top-3 right-3">
                        <StatusBadge status={deal.status} />
                      </div>
                    </div>

                    <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-black text-[var(--ink)] text-base line-clamp-1 group-hover:text-[var(--signal)] transition-colors">
                          {deal.title}
                        </h3>
                        <p className="text-xs text-[var(--muted)] line-clamp-2 mt-1 leading-relaxed font-normal">
                          {deal.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between mt-3">
                        <div>
                          <div className="text-[10px] text-[var(--muted)] font-bold uppercase">Budget</div>
                          <div className="text-sm font-black text-[var(--signal)]">
                            ₹{deal.budget_min} - ₹{deal.budget_max}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-[var(--signal)]">
                          <span>Manage Offers</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Offers I've Made */}
      {activeTab === "offers" && (
        <div className="space-y-4">
          {offersLoading ? (
            <div className="text-center py-12 text-xs text-[var(--muted)] font-semibold">
              Loading your submitted proposals...
            </div>
          ) : myOffers.length === 0 ? (
            <div className="text-center py-16 bg-[var(--surface)] rounded-3xl border border-[var(--line)] p-8 space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[var(--paper)] text-[var(--muted)] flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[var(--ink)] text-base">No offers submitted yet</h3>
              <p className="text-xs text-[var(--muted)] max-w-sm mx-auto font-normal">
                Explore the community radar to find neighbors seeking your tools, equipment, or skills.
              </p>
              <div className="pt-2">
                <Link
                  to="/deals"
                  className="px-5 py-2.5 rounded-xl bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <span>Explore Radar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {myOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--line)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--muted)]">Proposal on Need:</span>
                      <Link
                        to={`/deals/${offer.deal_id}`}
                        className="text-xs font-bold text-[var(--signal)] hover:underline flex items-center gap-1"
                      >
                        <span>View Need Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="text-sm font-semibold text-[var(--ink)]">{offer.terms}</div>
                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        Submitted {new Date(offer.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <div className="text-base font-black text-[var(--signal)]">₹{offer.price}</div>
                    <StatusBadge status={offer.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
