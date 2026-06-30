import { useState, useMemo } from 'react';
import { Mail, Plus, Eye, Send, Edit2, Trash2, X, Copy } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { sanitizeText, validateForm, MAX_LENGTHS } from '../../lib/validation';

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const CATEGORIES = ['Welcome', 'Status Update', 'Document Request', 'Placement Confirmation'];

const SAMPLE_DATA = {
  nurse_name: 'Jane Mthembu',
  cohort: 'Cohort 2025-A',
  start_date: '15 March 2025',
  dates: '15 March 2025 - 15 September 2025',
  status: 'Shortlisted - Yes',
  update_date: '10 January 2025',
  status_details: 'Your application has been reviewed and shortlisted for the next cohort.',
  previous_stage: 'Under Review',
  new_stage: 'Shortlisted - Yes',
  stage_description: 'Your application has been shortlisted for further consideration.',
  next_steps: 'Complete outstanding document uploads and prepare for an interview.',
  document_type: 'OET Certificate',
  deadline: '28 February 2025',
  expiry_date: '30 April 2025',
  days_remaining: '30',
  facility_name: 'NHS Barts Health Trust',
  facility_location: 'London, UK',
  role: 'Staff Nurse - Band 5',
  contract_duration: '24 months',
  orientation_date: '10 March 2025',
};

export default function EmailTemplates() {
  const { commEmailTemplates, communications, nurses, updateCommEmailTemplates, updateCommunications } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendNurseId, setSendNurseId] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'Welcome',
    subject: '',
    body: '',
  });
  const [editError, setEditError] = useState('');

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return commEmailTemplates;
    return commEmailTemplates.filter((t) => t.category === selectedCategory);
  }, [commEmailTemplates, selectedCategory]);

  function substituteVariables(text) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return SAMPLE_DATA[varName] || match;
    });
  }

  function handleCreateTemplate() {
    setEditForm({ name: '', category: 'Welcome', subject: '', body: '' });
    setSelectedTemplate(null);
    setEditError('');
    setShowEditor(true);
  }

  function handleEditTemplate(template) {
    setEditForm({
      name: template.name,
      category: template.category,
      subject: template.subject,
      body: template.body,
    });
    setSelectedTemplate(template);
    setEditError('');
    setShowEditor(true);
  }

  function handleSaveTemplate() {
    const { valid, errors } = validateForm(editForm, {
      name: { label: 'Template name', required: true, maxLength: MAX_LENGTHS.NAME },
      subject: { label: 'Subject', required: true, maxLength: MAX_LENGTHS.SHORT_TEXT },
      body: { label: 'Body', required: true, maxLength: MAX_LENGTHS.LONG_TEXT },
    });
    if (!valid) {
      setEditError(errors.name || errors.subject || errors.body);
      return;
    }
    setEditError('');

    // Sanitize before persisting. Subject/name are single-line; body keeps
    // newlines (it is multi-line and uses {{variable}} placeholders).
    const cleaned = {
      name: sanitizeText(editForm.name, { maxLength: MAX_LENGTHS.NAME }),
      category: editForm.category,
      subject: sanitizeText(editForm.subject, { maxLength: MAX_LENGTHS.SHORT_TEXT }),
      body: sanitizeText(editForm.body, { maxLength: MAX_LENGTHS.LONG_TEXT, allowNewlines: true }),
    };
    const variables = extractVariables(cleaned.subject + ' ' + cleaned.body);
    const now = new Date().toISOString().split('T')[0];

    if (selectedTemplate) {
      const updated = commEmailTemplates.map((t) =>
        t.id === selectedTemplate.id
          ? { ...t, ...cleaned, variables, updatedAt: now }
          : t
      );
      updateCommEmailTemplates(updated);
    } else {
      const newTemplate = {
        id: generateId('email-tmpl'),
        ...cleaned,
        variables,
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
      };
      updateCommEmailTemplates([...commEmailTemplates, newTemplate]);
    }
    setShowEditor(false);
  }

  function handleDeleteTemplate(templateId) {
    const updated = commEmailTemplates.filter((t) => t.id !== templateId);
    updateCommEmailTemplates(updated);
  }

  function handleSendSimulation() {
    if (!sendNurseId || !selectedTemplate) return;

    const nurse = nurses.find((n) => n.id === sendNurseId);
    const nurseName = nurse ? nurse.fullName : sendNurseId;

    // Log to communication history
    const comm = {
      id: generateId('comm'),
      nurseId: sendNurseId,
      channel: 'Email',
      type: selectedTemplate.category || 'Status Update',
      subject: selectedTemplate.subject.replace(/\{\{nurse_name\}\}/g, nurseName),
      notes: `Sent via template: ${selectedTemplate.name}`,
      date: new Date().toISOString().slice(0, 19),
      direction: 'outbound',
      status: 'sent',
      linkedEvent: null,
    };
    updateCommunications([comm, ...communications]);

    // Update template usage count
    const updated = commEmailTemplates.map((t) =>
      t.id === selectedTemplate.id ? { ...t, usageCount: t.usageCount + 1 } : t
    );
    updateCommEmailTemplates(updated);

    setShowSendModal(false);
    setSendNurseId('');
  }

  function extractVariables(text) {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))];
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <button
          onClick={handleCreateTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2573] transition-colors ml-auto"
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#5B2D8E]/10 text-[#5B2D8E] mt-1 inline-block">
                  {template.category}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setSelectedTemplate(template); setShowPreview(true); }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Preview"
                >
                  <Eye size={14} className="text-gray-500" />
                </button>
                <button
                  onClick={() => handleEditTemplate(template)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 size={14} className="text-gray-500" />
                </button>
                <button
                  onClick={() => { setSelectedTemplate(template); setShowSendModal(true); }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Send simulation"
                >
                  <Send size={14} className="text-gray-500" />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2 line-clamp-1">
              Subject: {template.subject}
            </p>
            <p className="text-xs text-gray-400 line-clamp-2">{template.body}</p>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Used {template.usageCount} times</span>
              <span className="text-xs text-gray-400">
                Variables: {template.variables.length}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Mail size={40} className="mx-auto mb-3 opacity-50" />
          <p>No templates in this category</p>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Template Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase">Subject</span>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {substituteVariables(selectedTemplate.subject)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Body</span>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {substituteVariables(selectedTemplate.body)}
                  </pre>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase">Sample Data Used</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedTemplate.variables.map((v) => (
                    <span key={v} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                      {v}: {SAMPLE_DATA[v] || 'N/A'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {selectedTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={() => setShowEditor(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Welcome Email"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  placeholder="Use {{variable_name}} for dynamic content"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea
                  value={editForm.body}
                  onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                  placeholder="Write your email template here. Use {{variable_name}} for dynamic content."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 resize-none font-mono"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Available Variables</p>
                <div className="flex flex-wrap gap-1">
                  {['nurse_name', 'cohort', 'start_date', 'dates', 'status', 'document_type', 'facility_name', 'deadline'].map((v) => (
                    <button
                      key={v}
                      onClick={() => setEditForm({ ...editForm, body: editForm.body + `{{${v}}}` })}
                      className="text-xs px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:border-[#5B2D8E] hover:text-[#5B2D8E] transition-colors"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              {editError && (
                <p role="alert" className="text-sm text-red-600 mr-auto self-center">{editError}</p>
              )}
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!editForm.name || !editForm.subject || !editForm.body}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5B2D8E] rounded-lg hover:bg-[#4a2573] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Simulation Modal */}
      {showSendModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Send Simulation</h3>
              <button
                onClick={() => setShowSendModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                This will simulate sending &quot;{selectedTemplate.name}&quot; and log it to the communication history.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Nurse</label>
                <select
                  value={sendNurseId}
                  onChange={(e) => setSendNurseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                >
                  <option value="">Select a nurse...</option>
                  {[...nurses].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((n) => (
                    <option key={n.id} value={n.id}>{n.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSimulation}
                disabled={!sendNurseId}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5B2D8E] rounded-lg hover:bg-[#4a2573] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                Simulate Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
