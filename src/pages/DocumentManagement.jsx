import { useState } from 'react';
import { FileText, ClipboardCheck, FilePlus, ShieldCheck } from 'lucide-react';
import DocumentRepository from '../components/documents/DocumentRepository';
import ComplianceChecklist from '../components/documents/ComplianceChecklist';
import DocumentTemplates from '../components/documents/DocumentTemplates';
import VerificationWorkflow from '../components/documents/VerificationWorkflow';

const TABS = [
  { id: 'repository', label: 'Document Repository', icon: FileText },
  { id: 'compliance', label: 'Compliance Checklist', icon: ClipboardCheck },
  { id: 'templates', label: 'Templates', icon: FilePlus },
  { id: 'verification', label: 'Verification', icon: ShieldCheck },
];

export default function DocumentManagement() {
  const [activeTab, setActiveTab] = useState('repository');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Management &amp; Compliance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track nurse documents, manage compliance requirements, and verify submissions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-white text-[#5B2D8E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'repository' && <DocumentRepository />}
      {activeTab === 'compliance' && <ComplianceChecklist />}
      {activeTab === 'templates' && <DocumentTemplates />}
      {activeTab === 'verification' && <VerificationWorkflow />}
    </div>
  );
}
