let docCounter = 0;

/**
 * Factory function to generate mock document objects.
 * Based on the shape from src/data/seedDocuments.js.
 * Pass overrides to customize specific fields.
 */
export function createDocument(overrides = {}) {
  docCounter++;
  const id = `doc-test-${String(docCounter).padStart(4, '0')}`;

  return {
    id,
    nurseId: 'nurse-test-001',
    type: 'Passport',
    status: 'Pending',
    uploadDate: '2025-03-15',
    expiryDate: '2028-03-15',
    fileName: 'passport_nurse-test-001.pdf',
    fileSize: 1200,
    verificationHistory: [],
    notes: '',
    ...overrides,
  };
}

/**
 * Create a verified document.
 */
export function createVerifiedDocument(overrides = {}) {
  return createDocument({
    status: 'Verified',
    verificationHistory: [
      {
        action: 'Approved',
        performedBy: 'Sarah Thompson',
        date: '2025-04-01',
        notes: 'Document verified successfully',
      },
    ],
    ...overrides,
  });
}

/**
 * Create multiple document objects at once.
 */
export function createDocuments(count, overrides = {}) {
  return Array.from({ length: count }, () => createDocument(overrides));
}
