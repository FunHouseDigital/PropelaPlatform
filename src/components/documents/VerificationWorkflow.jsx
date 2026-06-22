import { useState, useMemo } from 'react';
import { Check, X, Clock, History } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

function DaysWaiting({ uploadDate }) {
  const today = new Date();
  const uploaded = new Date(uploadDate);
  const days = Math.ceil((today - uploaded) / (1000 * 60 * 60 * 24));
  const color = days > 14 ? 'text-red-600' : days > 7 ? 'text-yellow-600' : 'text-gray-600';
  return <span className={`text-xs font-medium ${color}`}>{days} days</span>;
}

export default function VerificationWorkflow() {
  const { nurses, documents, verificationQueue, updateDocuments, updateVerificationQueue } = useAppContext();
  const [selectedItems, setSelectedItems] = useState([]);
  const [actionNotes, setActionNotes] = useState({});
  const [showNotesFor, setShowNotesFor] = useState(null);

  // Get pending items from the queue
  const pendingItems = useMemo(() => {
    return verificationQueue.map((item) => {
      const nurse = nurses.find((n) => n.id === item.nurseId);
      const doc = documents.find((d) => d.id === item.documentId);
      return {
        ...item,
        nurseName: nurse?.name || 'Unknown',
        documentStatus: doc?.status || 'Unknown',
      };
    }).filter((item) => item.documentStatus === 'Pending');
  }, [verificationQueue, nurses, documents]);

  // Get recent verification history from all documents
  const recentHistory = useMemo(() => {
    const allHistory = [];
    documents.forEach((doc) => {
      if (doc.verificationHistory && doc.verificationHistory.length > 0) {
        const nurse = nurses.find((n) => n.id === doc.nurseId);
        doc.verificationHistory.forEach((entry) => {
          allHistory.push({
            ...entry,
            documentType: doc.type,
            nurseName: nurse?.name || 'Unknown',
            documentId: doc.id,
          });
        });
      }
    });
    return allHistory
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);
  }, [documents, nurses]);

  function handleApprove(queueItem) {
    const notes = actionNotes[queueItem.id] || 'Document verified successfully';
    const now = new Date().toISOString().split('T')[0];

    // Update document status
    const updatedDocs = documents.map((doc) => {
      if (doc.id === queueItem.documentId) {
        return {
          ...doc,
          status: 'Verified',
          verificationHistory: [
            ...doc.verificationHistory,
            { action: 'Approved', performedBy: 'Admin', date: now, notes },
          ],
        };
      }
      return doc;
    });
    updateDocuments(updatedDocs);

    // Remove from queue
    const updatedQueue = verificationQueue.filter((q) => q.id !== queueItem.id);
    updateVerificationQueue(updatedQueue);

    // Clean up UI state
    setShowNotesFor(null);
    setActionNotes((prev) => { const n = { ...prev }; delete n[queueItem.id]; return n; });
    setSelectedItems((prev) => prev.filter((id) => id !== queueItem.id));
  }

  function handleReject(queueItem) {
    const notes = actionNotes[queueItem.id] || 'Document rejected';
    const now = new Date().toISOString().split('T')[0];

    // Update document status
    const updatedDocs = documents.map((doc) => {
      if (doc.id === queueItem.documentId) {
        return {
          ...doc,
          status: 'Rejected',
          verificationHistory: [
            ...doc.verificationHistory,
            { action: 'Rejected', performedBy: 'Admin', date: now, notes },
          ],
        };
      }
      return doc;
    });
    updateDocuments(updatedDocs);

    // Remove from queue
    const updatedQueue = verificationQueue.filter((q) => q.id !== queueItem.id);
    updateVerificationQueue(updatedQueue);

    setShowNotesFor(null);
    setActionNotes((prev) => { const n = { ...prev }; delete n[queueItem.id]; return n; });
    setSelectedItems((prev) => prev.filter((id) => id !== queueItem.id));
  }

  function handleBulkApprove() {
    const now = new Date().toISOString().split('T')[0];
    const selectedQueueItems = pendingItems.filter((item) => selectedItems.includes(item.id));

    const docIdsToApprove = selectedQueueItems.map((item) => item.documentId);

    const updatedDocs = documents.map((doc) => {
      if (docIdsToApprove.includes(doc.id)) {
        return {
          ...doc,
          status: 'Verified',
          verificationHistory: [
            ...doc.verificationHistory,
            { action: 'Approved', performedBy: 'Admin', date: now, notes: 'Bulk approved' },
          ],
        };
      }
      return doc;
    });
    updateDocuments(updatedDocs);

    const queueIdsToRemove = selectedQueueItems.map((item) => item.id);
    const updatedQueue = verificationQueue.filter((q) => !queueIdsToRemove.includes(q.id));
    updateVerificationQueue(updatedQueue);

    setSelectedItems([]);
  }

  function handleBulkReject() {
    const now = new Date().toISOString().split('T')[0];
    const selectedQueueItems = pendingItems.filter((item) => selectedItems.includes(item.id));

    const docIdsToReject = selectedQueueItems.map((item) => item.documentId);

    const updatedDocs = documents.map((doc) => {
      if (docIdsToReject.includes(doc.id)) {
        return {
          ...doc,
          status: 'Rejected',
          verificationHistory: [
            ...doc.verificationHistory,
            { action: 'Rejected', performedBy: 'Admin', date: now, notes: 'Bulk rejected' },
          ],
        };
      }
      return doc;
    });
    updateDocuments(updatedDocs);

    const queueIdsToRemove = selectedQueueItems.map((item) => item.id);
    const updatedQueue = verificationQueue.filter((q) => !queueIdsToRemove.includes(q.id));
    updateVerificationQueue(updatedQueue);

    setSelectedItems([]);
  }

  function toggleSelectAll() {
    if (selectedItems.length === pendingItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(pendingItems.map((item) => item.id));
    }
  }

  function toggleSelect(itemId) {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }

  return (
    <div>
      {/* Bulk Action Bar */}
      {selectedItems.length > 0 && (
        <div className="flex items-center gap-4 mb-4 bg-[#5B2D8E]/5 border border-[#5B2D8E]/20 rounded-lg p-3">
          <span className="text-sm text-[#5B2D8E] font-medium">
            {selectedItems.length} selected
          </span>
          <button
            onClick={handleBulkApprove}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Check size={14} />
            Bulk Approve
          </button>
          <button
            onClick={handleBulkReject}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <X size={14} />
            Bulk Reject
          </button>
        </div>
      )}

      {/* Pending Queue */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-[#5B2D8E]" />
          <h2 className="text-lg font-semibold text-gray-900">Verification Queue</h2>
          <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
            {pendingItems.length} pending
          </span>
        </div>

        {pendingItems.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === pendingItems.length && pendingItems.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nurse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waiting</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.nurseName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.documentType}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.uploadDate}</td>
                    <td className="px-4 py-3">
                      <DaysWaiting uploadDate={item.uploadDate} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.priority === 'High' ? 'bg-red-100 text-red-700' :
                        item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => showNotesFor === item.id ? handleApprove(item) : setShowNotesFor(item.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors"
                        >
                          <Check size={12} />
                          Approve
                        </button>
                        <button
                          onClick={() => showNotesFor === item.id ? handleReject(item) : setShowNotesFor(item.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors"
                        >
                          <X size={12} />
                          Reject
                        </button>
                      </div>
                      {showNotesFor === item.id && (
                        <div className="mt-2">
                          <textarea
                            value={actionNotes[item.id] || ''}
                            onChange={(e) => setActionNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Add notes..."
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#5B2D8E]/30"
                            rows={2}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-8 text-center">
            <Check size={24} className="mx-auto text-green-500 mb-2" />
            <p className="text-sm text-gray-600">All documents have been verified</p>
          </div>
        )}
      </div>

      {/* Verification History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <History size={18} className="text-[#5B2D8E]" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Verification History</h2>
        </div>

        {recentHistory.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nurse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentHistory.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{entry.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.nurseName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{entry.documentType}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.action === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{entry.performedBy}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{entry.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No verification history yet</p>
        )}
      </div>
    </div>
  );
}
