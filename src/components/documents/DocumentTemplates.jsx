import { useState } from 'react';
import { FileText, X, Download, UserPlus, Lock } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useExport } from '../../hooks/useExport';

// A template download only emits real record data when a specific nurse is
// selected (their name + id get substituted into the document). In that case it
// is a real single-record export and is gated under the Nurses module + audited.
// Plain template downloads (no nurse selected) contain only sample placeholders
// and are not gated.
const EXPORT_MODULE = 'Nurses';

function TypeBadge({ type }) {
  const colors = {
    'Offer Letter': 'bg-blue-100 text-blue-700',
    'Reference Request Form': 'bg-purple-100 text-purple-700',
    'Compliance Certificate': 'bg-green-100 text-green-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  );
}

function extractPlaceholders(content) {
  const matches = content.match(/\[([A-Z_]+)\]/g);
  return matches ? [...new Set(matches)] : [];
}

function TemplatePreviewModal({ template, nurses, onClose }) {
  const [selectedNurse, setSelectedNurse] = useState('');
  const [exportError, setExportError] = useState('');
  const { runExport, canExport } = useExport();
  const placeholders = extractPlaceholders(template.content);
  // Only an export-of-real-data when a nurse is selected; otherwise it's a
  // sample template, which anyone may download.
  const requiresPermission = !!selectedNurse;
  const blockedByPermission = requiresPermission && !canExport(EXPORT_MODULE);

  function buildAndDownload() {
    let content = template.content;
    // Replace placeholders with sample data
    const sampleData = {
      '[NURSE_NAME]': selectedNurse ? nurses.find((n) => n.id === selectedNurse)?.fullName || 'Jane Doe' : 'Jane Doe',
      '[NURSE_ID]': selectedNurse || 'nurse-001',
      '[ROLE]': 'Registered Nurse',
      '[FACILITY_NAME]': 'NHS Trust Hospital',
      '[START_DATE]': '2025-04-01',
      '[SALARY_BAND]': 'Band 5 (GBP 28,407-34,581)',
      '[REFEREE_NAME]': 'Dr. Smith',
      '[DATE]': new Date().toISOString().split('T')[0],
      '[DOCUMENT_LIST]': 'Passport, Nursing Qualification, OET Certificate',
      '[REF_NUMBER]': `REF-${Date.now()}`,
    };

    Object.entries(sampleData).forEach(([placeholder, value]) => {
      content = content.replaceAll(placeholder, value);
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDownload() {
    // Plain template (no nurse) → sample data only, no permission needed.
    if (!requiresPermission) {
      buildAndDownload();
      setExportError('');
      return;
    }
    // Real nurse record embedded → gate under Nurses + audit the attempt.
    const { allowed, error } = runExport(
      {
        module: EXPORT_MODULE,
        entityType: 'document',
        format: 'TXT',
        recordCount: 1,
        filters: { template: template.name, nurseId: selectedNurse },
      },
      buildAndDownload
    );
    setExportError(allowed ? '' : error);
  }

  // Highlight placeholders in content
  function renderContent() {
    const parts = template.content.split(/(\[[A-Z_]+\])/g);
    return parts.map((part, idx) => {
      if (part.match(/^\[[A-Z_]+\]$/)) {
        return (
          <span key={idx} className="bg-amber-100 text-amber-800 px-1 rounded">
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
            <TypeBadge type={template.type} />
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-700 font-mono">
            {renderContent()}
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-500 font-medium mb-2">
              Placeholders ({placeholders.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {placeholders.map((ph) => (
                <span key={ph} className="bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded text-xs">
                  {ph}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <select
                value={selectedNurse}
                onChange={(e) => setSelectedNurse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
              >
                <option value="">Select a nurse (optional)</option>
                {nurses.map((nurse) => (
                  <option key={nurse.id} value={nurse.id}>{nurse.fullName}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleDownload}
              disabled={blockedByPermission}
              title={blockedByPermission ? "You don't have permission to export this nurse's data" : undefined}
              className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#4a2574] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {blockedByPermission ? <Lock size={16} /> : <Download size={16} />}
              Download
            </button>
          </div>
          {exportError && (
            <p role="alert" className="text-sm text-red-600 font-medium">{exportError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentTemplates() {
  const { documentTemplates, nurses } = useAppContext();
  const [previewTemplate, setPreviewTemplate] = useState(null);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Manage document templates for offer letters, reference requests, and compliance certificates.
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentTemplates.map((template) => {
          const placeholders = extractPlaceholders(template.content);

          return (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-[#5B2D8E]/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#5B2D8E]/10 flex items-center justify-center">
                  <FileText size={18} className="text-[#5B2D8E]" />
                </div>
                <TypeBadge type={template.type} />
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-xs text-gray-500 mb-3">Category: {template.category}</p>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <span>{placeholders.length} placeholders</span>
                <span className="text-gray-300">|</span>
                <span>Updated: {template.updatedAt}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewTemplate(template)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#5B2D8E] border border-[#5B2D8E]/30 rounded-lg hover:bg-[#5B2D8E]/5 transition-colors"
                >
                  <FileText size={14} />
                  Preview
                </button>
                <button
                  onClick={() => setPreviewTemplate(template)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <UserPlus size={14} />
                  Generate for Nurse
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {documentTemplates.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No templates available</p>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          nurses={nurses}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}
