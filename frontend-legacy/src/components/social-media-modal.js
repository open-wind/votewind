// social-media-modal.js
"use client";
import { useState, useEffect } from "react";
import SocialShareButtons from "@/components/social-share-buttons";
import { 
  APP_BASE_URL
} from '@/lib/config';

export default function SocialMediaModal({ open, data = null, onClose }) {

  if (!open) return null;

  return (
  <>
  <div className="fixed inset-0 top-0 left-0 w-full h-full z-[9998] bg-black/40"></div>

  <div className="fixed inset-0 top-0 left-0 w-full h-full z-[9999] flex items-center justify-center px-4 pointer-events-auto">
    <div className="bg-white w-[90%] max-w-md p-4 rounded shadow-md">
      <div className="flex justify-center mb-4">
        <h1 className="text-xs sm:text-lg font-bold">Share turbine vote on social media</h1>
      </div>
      <div className="flex justify-center mb-4">
        <SocialShareButtons showstrap={false} title="Vote for this community wind turbine location!" suppliedurl={APP_BASE_URL + "/" + String(data.properties.lng) + "/" + String(data.properties.lat) + "/vote"} />
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-100 text-gray-600 px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  </div>
  </>
  );
}

