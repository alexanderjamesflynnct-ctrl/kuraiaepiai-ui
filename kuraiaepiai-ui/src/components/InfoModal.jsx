import { X, Info, Package } from "lucide-react";

const InfoModal = ({ isOpen, onClose, type, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-3 text-purple-700">
            {type === "ownership" ? <Info size={24} /> : <Package size={24} />}
            <h2 className="text-xl font-bold capitalize">{type} Overview</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">{children}</div>

        <div className="p-4 bg-gray-50 border-t text-right">
          <button
            onClick={onClose}
            className="bg-purple-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-purple-700 shadow-lg active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
