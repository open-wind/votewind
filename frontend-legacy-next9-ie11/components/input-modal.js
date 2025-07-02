// InputModal.js
"use client";
import { useState, useEffect } from "react";

export default function InputModal({ open, initialValue = "", onClose, onSubmit }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  return (
  <>
 <div className="fixed inset-0 z-60 bg-black/40">
    {/* This is the grey overlay */}
  </div>

  <div className="fixed top-20vh inset-0 z-50 flex items-start justify-center px-4">
    <div className="bg-white w-full max-w-sm p-4 rounded shadow-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(value);
          onClose();
        }}
      >
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          placeholder="Type your email"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-100 text-gray-600 px-4 py-2"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Done
          </button>
        </div>
      </form>
    </div>
  </div>
  </>
  );
}

