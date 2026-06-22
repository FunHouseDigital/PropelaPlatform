import { useState } from 'react';
import { X, User, Building2, FileCheck, Plane, CheckCircle2, Circle } from 'lucide-react';
import { VISA_STATUSES, SALARY_BANDS } from '../../lib/constants';

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function VisaStatusTracker({ currentStatus }) {
  const currentIdx = VISA_STATUSES.indexOf(currentStatus);

  return (
    <div className="space-y-2">
      {VISA_STATUSES.filter((s) => s !== 'Rejected').map((status, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={status} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              isCompleted
                ? 'bg-green-500 text-white'
                : isCurrent
                  ? 'bg-[#5B2D8E] text-white'
                  : 'bg-gray-200 text-gray-400'
            }`}>
              {isCompleted ? (
                <CheckCircle2 size={14} />
              ) : (
                <Circle size={14} />
              )}
            </div>
            <span className={`text-sm ${
              isCompleted
                ? 'text-green-700 font-medium'
                : isCurrent
                  ? 'text-[#5B2D8E] font-semibold'
                  : 'text-gray-400'
            }`}>
              {status}
            </span>
          </div>
        );
      })}
      {currentStatus === 'Rejected' && (
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500 text-white">
            <X size={14} />
          </div>
          <span className="text-sm text-red-700 font-semibold">Rejected</span>
        </div>
      )}
    </div>
  );
}

export default function PlacementDetailView({ placement, onClose, onUpdate }) {
  const [editingContract, setEditingContract] = useState(false);
  const [contractForm, setContractForm] = useState(placement.contractDetails);

  function handleChecklistToggle(index) {
    const updatedChecklist = placement.relocationChecklist.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    onUpdate({ ...placement, relocationChecklist: updatedChecklist });
  }

  function handleContractSave() {
    onUpdate({ ...placement, contractDetails: contractForm });
    setEditingContract(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">Placement Details</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Nurse Profile Summary */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User size={16} className="text-[#5B2D8E]" />
              <h3 className="text-sm font-semibold text-gray-900">Nurse Profile</h3>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-[#5B2D8E]/10 text-[#5B2D8E] flex items-center justify-center text-sm font-bold">
                {getInitials(placement.nurseName)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{placement.nurseName}</p>
                <p className="text-xs text-gray-500">{placement.specialty}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">Match Score</p>
                <p className="text-sm font-bold text-[#5B2D8E]">{placement.matchScore}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Current Stage</p>
                <p className="text-sm font-medium">{placement.currentStage}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Days in Stage</p>
                <p className="text-sm font-medium">{placement.daysInStage} days</p>
              </div>
            </div>
          </section>

          {/* Matched Facility Details */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-[#5B2D8E]" />
              <h3 className="text-sm font-semibold text-gray-900">Matched Facility</h3>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Facility</span>
                <span className="text-sm font-medium">{placement.facilityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Country</span>
                <span className="text-sm font-medium">{placement.targetCountry}</span>
              </div>
            </div>
          </section>

          {/* Visa/Immigration Status Tracker */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileCheck size={16} className="text-[#5B2D8E]" />
              <h3 className="text-sm font-semibold text-gray-900">Visa / Immigration Status</h3>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <VisaStatusTracker currentStatus={placement.visaStatus} />
            </div>
          </section>

          {/* Contract Details */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-[#5B2D8E]" />
                <h3 className="text-sm font-semibold text-gray-900">Contract Details</h3>
              </div>
              {!editingContract && (
                <button
                  onClick={() => setEditingContract(true)}
                  className="text-xs text-[#5B2D8E] font-medium hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingContract ? (
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Salary Band</label>
                  <select
                    value={contractForm.salaryBand}
                    onChange={(e) => setContractForm({ ...contractForm, salaryBand: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    {SALARY_BANDS.map((band) => (
                      <option key={band} value={band}>{band}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Role</label>
                  <input
                    type="text"
                    value={contractForm.role}
                    onChange={(e) => setContractForm({ ...contractForm, role: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleContractSave}
                    className="px-3 py-1 bg-[#5B2D8E] text-white text-xs font-medium rounded hover:bg-[#4a2475]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setContractForm(placement.contractDetails);
                      setEditingContract(false);
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Start Date</span>
                  <span className="text-sm font-medium">{placement.contractDetails.startDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Salary Band</span>
                  <span className="text-sm font-medium">{placement.contractDetails.salaryBand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Role</span>
                  <span className="text-sm font-medium">{placement.contractDetails.role}</span>
                </div>
              </div>
            )}
          </section>

          {/* Relocation Checklist */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Plane size={16} className="text-[#5B2D8E]" />
              <h3 className="text-sm font-semibold text-gray-900">Relocation Checklist</h3>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              {placement.relocationChecklist.map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleChecklistToggle(idx)}
                    className="rounded border-gray-300 text-[#5B2D8E] focus:ring-[#5B2D8E]"
                  />
                  <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.item}
                  </span>
                </label>
              ))}
              <div className="pt-2 border-t border-gray-200 mt-2">
                <p className="text-xs text-gray-500">
                  {placement.relocationChecklist.filter((i) => i.checked).length} of{' '}
                  {placement.relocationChecklist.length} completed
                </p>
              </div>
            </div>
          </section>

          {/* Stage History */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Stage History</h3>
            <div className="space-y-2">
              {placement.stageHistory.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-gray-400 w-20">{entry.enteredAt}</span>
                  <span className="text-gray-700">{entry.stage}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
