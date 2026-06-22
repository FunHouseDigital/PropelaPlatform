import { useState, useMemo } from 'react';
import { Search, Upload, FileText, Trash2, Eye, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

function StatusBadge({ status }) {
  const colors = {
    Verified: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Expired: 'bg-red-100 text-red-700',
    Rejected: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function ExpiryBadge({ expiryDate }) {
  if (!expiryDate) return null;

  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Expired</span>;
  }
  if (daysUntilExpiry < 30) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{daysUntilExpiry}d left</span>;
  }
  if (daysUntilExpiry < 90) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{daysUntilExpiry}d left</span>;
  }
  return null;
}

function DocumentCard({ doc, onDelete }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-[#5B2D8E]/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#5B2D8E]/10 flex items-center justify-center">
            <FileText size={18} className="text-[#5B2D8E]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{doc.type}</p>
            <p className="text-xs text-gray-500">{doc.fileName}</p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>Uploaded: {doc.uploadDate}</span>
        {doc.expiryDate && <span>Expires: {doc.expiryDate}</span>}
        <ExpiryBadge expiryDate={doc.expiryDate} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-[#5B2D8E] rounded hover:bg-gray-100">
          <Eye size={14} />
          View
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-red-600 rounded hover:bg-gray-100"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}

function DropZone({ onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    onDrop();
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragOver
          ? 'border-[#5B2D8E] bg-[#5B2D8E]/5'
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <Upload size={24} className="mx-auto text-gray-400 mb-2" />
      <p className="text-sm text-gray-600">Drag and drop files here to upload</p>
      <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
    </div>
  );
}

export default function DocumentRepository() {
  const { nurses, documents, updateDocuments } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedNurse, setSelectedNurse] = useState(null);

  const nurseList = useMemo(() => {
    return nurses
      .filter((nurse) => {
        const matchesSearch = nurse.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStage = !stageFilter || nurse.pipelineStage === stageFilter;
        return matchesSearch && matchesStage;
      })
      .map((nurse) => {
        const nurseDocCount = documents.filter((d) => d.nurseId === nurse.id).length;
        return { ...nurse, docCount: nurseDocCount };
      });
  }, [nurses, documents, searchTerm, stageFilter]);

  const stages = useMemo(() => {
    return [...new Set(nurses.map((n) => n.pipelineStage))].sort();
  }, [nurses]);

  const selectedNurseDocs = useMemo(() => {
    if (!selectedNurse) return [];
    return documents.filter((d) => d.nurseId === selectedNurse.id);
  }, [documents, selectedNurse]);

  function handleDelete(docId) {
    const updated = documents.filter((d) => d.id !== docId);
    updateDocuments(updated);
  }

  function handleDrop() {
    if (!selectedNurse) return;
    const newDoc = {
      id: `doc-${Date.now()}`,
      nurseId: selectedNurse.id,
      type: 'Pending Classification',
      status: 'Pending',
      uploadDate: new Date().toISOString().split('T')[0],
      expiryDate: null,
      fileName: `uploaded_document_${Date.now()}.pdf`,
      fileSize: 1024,
      verificationHistory: [],
      notes: '',
    };
    updateDocuments([...documents, newDoc]);
  }

  if (selectedNurse) {
    return (
      <div>
        <button
          onClick={() => setSelectedNurse(null)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#5B2D8E] mb-4"
        >
          <ArrowLeft size={16} />
          Back to nurse list
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{selectedNurse.name}</h2>
          <p className="text-sm text-gray-500">
            {selectedNurse.pipelineStage} - {selectedNurseDocs.length} documents
          </p>
        </div>

        <DropZone onDrop={handleDrop} />

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedNurseDocs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
          ))}
        </div>

        {selectedNurseDocs.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No documents uploaded yet</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search nurses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
        >
          <option value="">All Stages</option>
          {stages.map((stage) => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
      </div>

      {/* Nurse List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nurseList.map((nurse) => (
          <button
            key={nurse.id}
            onClick={() => setSelectedNurse(nurse)}
            className="text-left border border-gray-200 rounded-lg p-4 hover:border-[#5B2D8E]/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{nurse.name}</p>
              <span className="text-xs font-medium bg-[#5B2D8E]/10 text-[#5B2D8E] px-2 py-0.5 rounded-full">
                {nurse.docCount} docs
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{nurse.pipelineStage}</p>
          </button>
        ))}
      </div>

      {nurseList.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No nurses found</p>
      )}
    </div>
  );
}
