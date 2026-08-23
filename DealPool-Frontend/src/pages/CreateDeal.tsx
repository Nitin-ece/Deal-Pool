import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { createDeal } from "../redux/slices/dealsSlice";
import { DealCategory } from "../types";
import { DEFAULT_RADIUS_KM, DEFAULT_LOCATION } from "../lib/constants";
import { PlacesAutocomplete } from "../components/map/PlacesAutocomplete";
import { LocationPermissionGate } from "../components/map/LocationPermissionGate";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../lib/errors";
import {
  Sparkles,
  Box,
  Code,
  Wrench,
  Package,
  Check,
  AlertCircle,
  MapPin,
  ArrowLeft,
  Radio,
  Image as ImageIcon,
  Camera,
} from "lucide-react";

const CATEGORY_OPTIONS: Array<{
  value: DealCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "Physical Resource",
    label: "Physical Resource",
    description: "Borrow tools, appliances, projectors, ladders, tables",
    icon: <Box className="w-5 h-5" />,
  },
  {
    value: "Skill",
    label: "Skill & Mentorship",
    description: "Coding assistance, tutoring, design review, music coaching",
    icon: <Code className="w-5 h-5" />,
  },
  {
    value: "Service",
    label: "Local Service",
    description: "Help moving, shelf assembly, repairs, photography",
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    value: "Equipment",
    label: "Heavy Equipment",
    description: "Generators, cameras, drills, lawnmowers, synthesizers",
    icon: <Package className="w-5 h-5" />,
  },
];

const PRESET_ITEM_IMAGES = [
  { label: "Projector / Screen", url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80" },
  { label: "Power Drill", url: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80" },
  { label: "Camera Kit", url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80" },
  { label: "Dev / Coding", url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80" },
  { label: "Furniture / Move", url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80" },
  { label: "Acoustic Guitar", url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80" },
  { label: "Camping Tent", url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=80" },
];

export function CreateDeal() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { userLocation } = useAppSelector((state) => state.deals);

  const [category, setCategory] = useState<DealCategory>("Physical Resource");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState(PRESET_ITEM_IMAGES[0].url);
  const [budgetMin, setBudgetMin] = useState<number | string>(500);
  const [budgetMax, setBudgetMax] = useState<number | string>(800);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [locationData, setLocationData] = useState({
    address: userLocation.address || DEFAULT_LOCATION.address,
    lat: userLocation.lat || DEFAULT_LOCATION.lat,
    lng: userLocation.lng || DEFAULT_LOCATION.lng,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 5) {
      errs.title = "Title must be at least 5 characters.";
    }
    if (!description.trim() || description.trim().length < 10) {
      errs.description = "Please describe what you are looking for (min 10 characters).";
    }
    if (!budgetMin || Number(budgetMin) <= 0) {
      errs.budget = "Please enter a valid minimum budget.";
    }
    if (budgetMax && Number(budgetMax) < Number(budgetMin)) {
      errs.budget = "Maximum budget must be greater than or equal to minimum budget.";
    }
    if (!locationData.lat || !locationData.lng) {
      errs.location = "Please pick a valid location.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const created = await dispatch(
        createDeal({
          title: title.trim(),
          description: description.trim(),
          category,
          budgetMin: Number(budgetMin),
          budgetMax: Number(budgetMax) || Number(budgetMin),
          lat: locationData.lat,
          lng: locationData.lng,
          radiusKm,
          address: locationData.address,
          image_url: imageUrl.trim() || undefined,
        })
      ).unwrap();

      navigate(`/deals/${created.id}`);
    } catch (err: any) {
      setErrors({ form: getErrorMessage(err, "Failed to post deal. Please try again.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Top Back Navigation */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#059669] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Top Map Visual Live Radar Banner replacing static placeholder */}
      <div className="relative rounded-3xl overflow-hidden border border-[#E5E5E2] bg-gray-900 shadow-xs">
        <LocationPermissionGate heightClass="h-56 sm:h-64" />
      </div>

      {errors.form && (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      {/* Form Content */}
      <form id="create-deal-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Category Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
            1. Select Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  id={`cat-select-${cat.value.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setCategory(cat.value)}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                    isSelected
                      ? "bg-[#F0FDF4] border-[#10B981] ring-2 ring-[#10B981]/20 shadow-xs"
                      : "bg-white border-[#E5E5E2] hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected ? "bg-[#10B981] text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <div className="font-bold text-[#1A1A1A] text-sm">{cat.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{cat.description}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Item Image & Visual Preview */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E5E2] shadow-xs space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
            2. Item Photograph / Visual Reference
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            <div className="sm:col-span-4 h-36 rounded-2xl overflow-hidden bg-gray-100 border border-[#E5E5E2] relative group">
              <img
                src={imageUrl || PRESET_ITEM_IMAGES[0].url}
                alt="Item preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                Live Item Preview
              </div>
            </div>

            <div className="sm:col-span-8 space-y-3">
              <div className="text-xs text-gray-600 font-medium">
                Choose a preset visual matching your need or provide a custom image link:
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ITEM_IMAGES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      imageUrl === preset.url
                        ? "bg-[#10B981] text-white border-[#10B981] shadow-xs"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste an image URL (https://...)"
                className="w-full px-3.5 py-2 bg-gray-50 rounded-xl text-xs text-[#1A1A1A] border border-[#E5E5E2] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10B981] transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Need Title & Description */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E5E2] shadow-xs space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              3. Need Title & Specifications
            </label>
            <input
              id="deal-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Need a 4K Projector + screen for Friday community screening"
              className={`w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-semibold text-[#1A1A1A] border ${
                errors.title ? "border-rose-400 focus:ring-rose-200" : "border-[#E5E5E2] focus:border-[#10B981]"
              } focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10B981] transition-all`}
            />
            {errors.title && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Detailed Description & Terms
            </label>
            <textarea
              id="deal-description-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specify requirements, timing, exact model specs, duration needed, and handover preferences..."
              className={`w-full p-4 bg-gray-50 rounded-xl text-sm text-[#1A1A1A] border ${
                errors.description
                  ? "border-rose-400 focus:ring-rose-200"
                  : "border-[#E5E5E2] focus:border-[#10B981]"
              } focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10B981] transition-all leading-relaxed`}
            />
            {errors.description && (
              <p className="text-xs text-rose-500 mt-1 font-medium">{errors.description}</p>
            )}
          </div>

          {/* Budget Range */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Expected Budget Range (₹)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-gray-400 font-medium block mb-1">Minimum Budget</span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    id="deal-budget-min-input"
                    type="number"
                    min="0"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="400"
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm font-semibold text-[#1A1A1A] border border-[#E5E5E2] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10B981] transition-all"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] text-gray-400 font-medium block mb-1">Maximum Budget</span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    id="deal-budget-max-input"
                    type="number"
                    min="0"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="800"
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm font-semibold text-[#1A1A1A] border border-[#E5E5E2] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10B981] transition-all"
                  />
                </div>
              </div>
            </div>
            {errors.budget && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.budget}</p>}
          </div>
        </div>

        {/* Section 4: Location & Discovery Radius */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E5E2] shadow-xs space-y-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
            4. Location & Discovery Radius
          </label>

          <PlacesAutocomplete
            value={locationData.address}
            lat={locationData.lat}
            lng={locationData.lng}
            onChange={(loc) => setLocationData(loc)}
            error={errors.location}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700">Broadcast Range</span>
              <span className="text-xs font-black text-[#059669] bg-[#F0FDF4] px-2.5 py-0.5 rounded-lg border border-emerald-100">
                {radiusKm} km
              </span>
            </div>
            <input
              id="deal-radius-slider"
              type="range"
              min="1"
              max="25"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-[#10B981] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-semibold">
              <span>1 km (Hyperlocal)</span>
              <span>8 km (District sector)</span>
              <span>25 km (Metropolitan)</span>
            </div>
          </div>
        </div>

        {/* Post Button */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-3 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="publish-deal-btn"
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold shadow-md shadow-emerald-100 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSubmitting ? "Broadcasting Need..." : "Publish to Community Radar"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
