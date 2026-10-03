import { useState, useRef, useEffect } from "react";

export default function SearchableCombobox({
  items = [],
  selectedId,
  onSelect,
  placeholder = "-- Search & Select --",
  disabled = false,
  formatLabel = (item) => item.name,
  borderColor = "focus-within:border-orange-400"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  const selectedItem = items.find((item) => String(item.id) === String(selectedId));

  // Sync internal search field with selected item name
  useEffect(() => {
    setSearchTerm(selectedItem ? formatLabel(selectedItem) : "");
  }, [selectedId, items]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // Reset display to current selection on blur
        setSearchTerm(selectedItem ? formatLabel(selectedItem) : "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedItem, formatLabel]);

  // Filter available catalog options by user search
  const filteredItems = items.filter((item) =>
    formatLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePick = (item) => {
    onSelect(item.id);
    setSearchTerm(formatLabel(item));
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <div
        className={`flex items-center bg-gray-50 border border-gray-200 sm:border-transparent rounded-xl px-4 py-3 transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } ${isOpen ? `bg-white ${borderColor} shadow-sm` : ""}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <input
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-transparent outline-none font-medium text-gray-700 cursor-text"
        />
        <i
          className={`fa-solid fa-chevron-down text-xs text-gray-400 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-gray-600" : ""
          }`}
        ></i>
      </div>

      {isOpen && !disabled && (
        <ul className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 focus:outline-none">
          {filteredItems.length > 0 ? (
            filteredItems.map((opt) => (
              <li
                key={opt.id}
                onMouseDown={() => handlePick(opt)}
                className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                  String(opt.id) === String(selectedId)
                    ? "bg-green-50 text-green-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>{formatLabel(opt)}</span>
                {String(opt.id) === String(selectedId) && (
                  <i className="fa-solid fa-check text-xs text-green-600"></i>
                )}
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-xs text-gray-400 text-center select-none font-medium">
              No matching catalog items found
            </li>
          )}
        </ul>
      )}
    </div>
  );
}