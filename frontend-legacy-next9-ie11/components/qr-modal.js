'use client';

import QRCode from "react-qr-code";
import PlayStoreButton from '@/components/play-store-button';
import { MOBILEAPP_URL } from '@/lib/config';

export default function QRModal({ url, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center pointer-events-auto">
      <div className="relative w-full h-full sm:w-[80vw] sm:h-[80vh] bg-white rounded-lg shadow-4xl overflow-hidden">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-10 h-10 text-gray-600 hover:bg-white bg-white bg-opacity-70 rounded-full p-1"
        >
          ✕
        </button>

        <div className="w-full h-full flex flex-col justify-center items-center text-center">
            <div className="pb-4">
              <h2>Download <b>VoteWind.org Mobile App</b> from:</h2>
              <PlayStoreButton url={MOBILEAPP_URL} />
            </div>

            <h2 className="mb-8 text-center">From within app, scan QR code to view wind turbine in Augmented Reality:</h2>
            <div className="flex justify-center mb-4">
                <QRCode value={url} size={256} level="H" />
            </div>
            <button onClick={onClose} className="block mx-auto mt-8 px-4 py-2 text-sm bg-gray-200 rounded">
                Close
            </button>
        </div>

      </div>
    </div>
  );
}