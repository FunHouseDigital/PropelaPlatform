import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, X, Search } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { COMPLIANCE_REQUIRED_DOCUMENTS } from '../../lib/constants';

function ComplianceProgressBar({ percentage }) {
  const getColor = () => {
    if (percentage >= 80) return 'from-green-400 to-green-500';
    if (percentage >= 50) return 'from-yellow-400 to-yellow-500';
    return 'from-red-400 to-red-500';
  };

  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${getColor()} transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function NurseComplianceRow({ nurse, complianceData, documents }) {
  const [expanded, setExpanded] = useState(false);

  const { requiredDocs, verifiedDocs, percentage } = complianceData;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="text-gray-400">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-gray-900 truncate">{nurse.name}</p>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
              {nurse.pipelineStage}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 max-w-[200px]">
              <ComplianceProgressBar percentage={percentage} />
            </div>
            <span className={`text-xs font-semibold ${
              percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {percentage}%
            </span>
            <span className="text-xs text-gray-500">
              {verifiedDocs}/{requiredDocs.length} documents
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-2">
            {requiredDocs.map((docType) => {
              const nurseDoc = documents.find(
                (d) => d.nurseId === nurse.id && d.type === docType && d.status === 'Verified'
              );
              const isVerified = !!nurseDoc;

              return (
                <div key={docType} className="flex items-center gap-3">
                  {isVerified ? (
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <Check size={12} className="text-green-600" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                      <X size={12} className="text-red-600" />
                    </div>
                  )}
                  <span className={`text-sm ${isVerified ? 'text-gray-700' : 'text-gray-500'}`}>
                    {docType}
                  </span>
                  {isVerified && (
                    <span className="text-xs text-green-600 ml-auto">Verified</span>
                  )}
                  {!isVerified && (
                    <span className="text-xs text-red-500 ml-auto">Missing / Pending</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComplianceChecklist() {
  const { nurses, documents } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');

  const complianceData = useMemo(() => {
    return nurses.map((nurse) => {
      const requiredDocs = COMPLIANCE_REQUIRED_DOCUMENTS[nurse.pipelineStage] || [];
      const verifiedDocs = requiredDocs.filter((docType) =>
        documents.some(
          (d) => d.nurseId === nurse.id && d.type === docType && d.status === 'Verified'
        )
      ).length;
      const percentage = requiredDocs.length > 0
        ? Math.round((verifiedDocs / requiredDocs.length) * 100)
        : 0;

      return {
        nurse,
        complianceData: { requiredDocs, verifiedDocs, percentage },
      };
    });
  }, [nurses, documents]);

  const filteredData = useMemo(() => {
    return complianceData.filter(({ nurse, complianceData: cd }) => {
      const matchesSearch = nurse.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = !stageFilter || nurse.pipelineStage === stageFilter;
      let matchesCompliance = true;
      if (complianceFilter === '0-50') matchesCompliance = cd.percentage < 50;
      else if (complianceFilter === '50-80') matchesCompliance = cd.percentage >= 50 && cd.percentage < 80;
      else if (complianceFilter === '80-100') matchesCompliance = cd.percentage >= 80;
      return matchesSearch && matchesStage && matchesCompliance;
    });
  }, [complianceData, searchTerm, stageFilter, complianceFilter]);

  const stages = useMemo(() => {
    return [...new Set(nurses.map((n) => n.pipelineStage))].sort();
  }, [nurses]);

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
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
        <select
          value={complianceFilter}
          onChange={(e) => setComplianceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
        >
          <option value="">All Compliance Levels</option>
          <option value="0-50">Below 50%</option>
          <option value="50-80">50% - 80%</option>
          <option value="80-100">80% - 100%</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-green-700">
            {complianceData.filter((d) => d.complianceData.percentage >= 80).length}
          </p>
          <p className="text-xs text-green-600 mt-1">Highly Compliant (80%+)</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-yellow-700">
            {complianceData.filter((d) => d.complianceData.percentage >= 50 && d.complianceData.percentage < 80).length}
          </p>
          <p className="text-xs text-yellow-600 mt-1">Partially Compliant (50-80%)</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-red-700">
            {complianceData.filter((d) => d.complianceData.percentage < 50).length}
          </p>
          <p className="text-xs text-red-600 mt-1">Low Compliance (&lt;50%)</p>
        </div>
      </div>

      {/* Nurse List */}
      <div className="space-y-3">
        {filteredData.map(({ nurse, complianceData: cd }) => (
          <NurseComplianceRow
            key={nurse.id}
            nurse={nurse}
            complianceData={cd}
            documents={documents}
          />
        ))}
      </div>

      {filteredData.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No nurses match the current filters</p>
      )}
    </div>
  );
}
