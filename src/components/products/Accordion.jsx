// components/Accordion.jsx
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <h4 className="text-md font-semibold text-gray-800">{title}</h4>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {open && (
        <div className="px-4 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          {children}
        </div>
      )}
    </div>
  );
}
