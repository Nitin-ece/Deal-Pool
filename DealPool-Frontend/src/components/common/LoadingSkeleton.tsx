import React from "react";

export function DealCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-5 w-28 bg-slate-200 rounded-md"></div>
        <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
      </div>
      <div className="space-y-2">
        <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
        <div className="h-4 w-full bg-slate-100 rounded"></div>
        <div className="h-4 w-2/3 bg-slate-100 rounded"></div>
      </div>
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <div className="h-5 w-24 bg-slate-200 rounded"></div>
        <div className="h-6 w-20 bg-emerald-100 rounded-lg"></div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <div className="w-6 h-6 rounded-full bg-slate-200"></div>
        <div className="h-4 w-28 bg-slate-200 rounded"></div>
      </div>
    </div>
  );
}

export function DealDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
      <div className="lg:col-span-7 space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="h-10 w-4/5 bg-slate-200 rounded"></div>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-200"></div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-3 w-20 bg-slate-100 rounded"></div>
          </div>
        </div>
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="h-4 w-full bg-slate-100 rounded"></div>
          <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
          <div className="h-4 w-4/6 bg-slate-100 rounded"></div>
        </div>
      </div>
      <div className="lg:col-span-5 space-y-6">
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
        <div className="h-40 bg-slate-200 rounded-2xl"></div>
      </div>
    </div>
  );
}
