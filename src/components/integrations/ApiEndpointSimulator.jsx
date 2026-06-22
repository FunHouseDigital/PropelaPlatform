import { useState, useCallback } from 'react';
import { Activity, Zap, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const METHOD_COLORS = {
  GET: 'bg-green-100 text-green-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  PATCH: 'bg-purple-100 text-purple-800',
};

const STATUS_BADGES = {
  active: 'bg-green-100 text-green-700',
  deprecated: 'bg-red-100 text-red-700',
  beta: 'bg-yellow-100 text-yellow-700',
};

function generateMockRequest(endpoint) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer pk_live_*****',
    'X-Request-ID': `req_${Date.now().toString(36)}`,
    Accept: 'application/json',
  };

  const params = {};
  if (endpoint.method === 'GET' && endpoint.path.includes(':id')) {
    params.id = 'nurse-001';
  } else if (endpoint.method === 'GET') {
    params.page = 1;
    params.limit = 20;
    params.status = 'active';
  }

  return { method: endpoint.method, url: `https://api.propela.io${endpoint.path.replace(':id', 'nurse-001')}`, headers, params };
}

function generateMockResponse(endpoint, simulateError) {
  if (simulateError) {
    const errors = [
      { code: 400, body: { error: 'Bad Request', message: 'Invalid parameters provided' } },
      { code: 401, body: { error: 'Unauthorized', message: 'Invalid or expired API key' } },
      { code: 404, body: { error: 'Not Found', message: 'The requested resource does not exist' } },
      { code: 500, body: { error: 'Internal Server Error', message: 'An unexpected error occurred' } },
      { code: 503, body: { error: 'Service Unavailable', message: 'The service is temporarily unavailable' } },
    ];
    const err = errors[Math.floor(Math.random() * errors.length)];
    return { statusCode: err.code, headers: { 'Content-Type': 'application/json' }, body: err.body, latency: `${endpoint.responseDelay}ms` };
  }

  const bodies = {
    GET: endpoint.path.includes(':id')
      ? { id: 'nurse-001', name: 'Sarah Johnson', stage: 'Onboarding', speciality: 'Critical Care', complianceScore: 92 }
      : { data: [{ id: 'nurse-001', name: 'Sarah Johnson' }, { id: 'nurse-002', name: 'Michael Chen' }], meta: { total: 48, page: 1, limit: 20 } },
    POST: { id: `new-${Date.now().toString(36)}`, status: 'created', message: 'Resource created successfully' },
    PUT: { id: 'nurse-001', status: 'updated', message: 'Resource updated successfully' },
    DELETE: { status: 'deleted', message: 'Resource deleted successfully' },
  };

  return {
    statusCode: endpoint.method === 'POST' ? 201 : 200,
    headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '98', 'X-Response-Time': `${endpoint.responseDelay}ms` },
    body: bodies[endpoint.method] || bodies.GET,
    latency: `${endpoint.responseDelay}ms`,
  };
}

export default function ApiEndpointSimulator() {
  const { apiEndpoints, updateApiEndpoints } = useAppContext();
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [simulateError, setSimulateError] = useState(false);
  const [mockRequest, setMockRequest] = useState(null);
  const [mockResponse, setMockResponse] = useState(null);

  const handleEndpointClick = useCallback((endpoint) => {
    setSelectedEndpoint(endpoint);
    setMockRequest(generateMockRequest(endpoint));
    setMockResponse(generateMockResponse(endpoint, simulateError));
  }, [simulateError]);

  const handleDelayChange = useCallback((endpointId, newDelay) => {
    const updated = apiEndpoints.map((ep) =>
      ep.id === endpointId ? { ...ep, responseDelay: parseInt(newDelay, 10) } : ep
    );
    updateApiEndpoints(updated);
    if (selectedEndpoint && selectedEndpoint.id === endpointId) {
      const updatedEp = { ...selectedEndpoint, responseDelay: parseInt(newDelay, 10) };
      setSelectedEndpoint(updatedEp);
      setMockResponse(generateMockResponse(updatedEp, simulateError));
    }
  }, [apiEndpoints, updateApiEndpoints, selectedEndpoint, simulateError]);

  const handleErrorToggle = useCallback((endpointId) => {
    const updated = apiEndpoints.map((ep) =>
      ep.id === endpointId ? { ...ep, errorRate: ep.errorRate > 0 ? 0 : 0.5 } : ep
    );
    updateApiEndpoints(updated);
  }, [apiEndpoints, updateApiEndpoints]);

  const toggleSimulateError = useCallback(() => {
    setSimulateError((prev) => {
      const next = !prev;
      if (selectedEndpoint) {
        setMockResponse(generateMockResponse(selectedEndpoint, next));
      }
      return next;
    });
  }, [selectedEndpoint]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-[#5B2D8E]" />
          <h2 className="text-lg font-semibold text-gray-900">API Endpoint Simulator</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSimulateError}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              simulateError
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            <AlertTriangle size={14} />
            Error Simulation {simulateError ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Endpoint Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Path</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Response Delay</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Error Rate</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {apiEndpoints.map((endpoint) => (
              <tr
                key={endpoint.id}
                onClick={() => handleEndpointClick(endpoint)}
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedEndpoint?.id === endpoint.id ? 'bg-purple-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${METHOD_COLORS[endpoint.method] || 'bg-gray-100 text-gray-700'}`}>
                    {endpoint.method}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-800">{endpoint.path}</td>
                <td className="px-4 py-3 text-gray-600">{endpoint.description}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[endpoint.status] || 'bg-gray-100 text-gray-700'}`}>
                    {endpoint.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="5000"
                      step="50"
                      value={endpoint.responseDelay}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleDelayChange(endpoint.id, e.target.value)}
                      className="w-20 h-1.5 accent-[#5B2D8E]"
                    />
                    <span className="text-xs text-gray-500 w-12">{endpoint.responseDelay}ms</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleErrorToggle(endpoint.id);
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      endpoint.errorRate > 0 ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        endpoint.errorRate > 0 ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <ChevronRight size={14} className="text-gray-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Request/Response Viewer */}
      {selectedEndpoint && mockRequest && mockResponse && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Request Panel */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
              <Zap size={14} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Request</span>
            </div>
            <div className="p-4">
              <div className="mb-3">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${METHOD_COLORS[mockRequest.method]}`}>
                  {mockRequest.method}
                </span>
                <span className="ml-2 text-sm font-mono text-gray-700">{mockRequest.url}</span>
              </div>
              <div className="mb-2 text-xs font-medium text-gray-500 uppercase">Headers</div>
              <pre className="bg-gray-900 text-green-400 rounded-md p-3 text-xs overflow-x-auto">
                <code>{JSON.stringify(mockRequest.headers, null, 2)}</code>
              </pre>
              {Object.keys(mockRequest.params).length > 0 && (
                <>
                  <div className="mt-3 mb-2 text-xs font-medium text-gray-500 uppercase">Parameters</div>
                  <pre className="bg-gray-900 text-green-400 rounded-md p-3 text-xs overflow-x-auto">
                    <code>{JSON.stringify(mockRequest.params, null, 2)}</code>
                  </pre>
                </>
              )}
            </div>
          </div>

          {/* Response Panel */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-green-600" />
                <span className="text-sm font-medium text-gray-700">Response</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  mockResponse.statusCode < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {mockResponse.statusCode}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} />
                  {mockResponse.latency}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="mb-2 text-xs font-medium text-gray-500 uppercase">Headers</div>
              <pre className="bg-gray-900 text-green-400 rounded-md p-3 text-xs overflow-x-auto">
                <code>{JSON.stringify(mockResponse.headers, null, 2)}</code>
              </pre>
              <div className="mt-3 mb-2 text-xs font-medium text-gray-500 uppercase">Body</div>
              <pre className="bg-gray-900 text-green-400 rounded-md p-3 text-xs overflow-x-auto">
                <code>{JSON.stringify(mockResponse.body, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
