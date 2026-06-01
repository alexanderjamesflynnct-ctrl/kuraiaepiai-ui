const OwnershipForm = ({ data }) => {
  if (!data) return null;

  // Helper to turn CamelCase into Human Readable
  const formatKey = (key) => key.replace(/([A-Z])/g, " $1").trim();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="border-b border-gray-100 pb-3">
          <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">
            {formatKey(key)}
          </label>
          <div className="text-gray-800 font-semibold text-lg">
            {Array.isArray(value) ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {value.map((item, i) => (
                  <span
                    key={i}
                    className="bg-gray-100 px-2 py-1 rounded text-sm font-normal border"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              value.toString()
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OwnershipForm;
