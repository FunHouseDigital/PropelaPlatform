import { Template } from '@/types/template';

export const mockTemplates: Template[] = [
  {
    id: 'tmpl-001',
    name: 'Welcome Email',
    category: 'Email',
    subject: 'Welcome to Propela, {{nurse_name}}!',
    body: `Dear {{nurse_name}},

Welcome to the Propela programme! We are thrilled to have you join us as part of {{cohort_name}}.

Your journey towards an international nursing career starts now. Here is what you can expect in the coming weeks:

1. You will receive your programme agreement to review and sign.
2. Your dedicated cohort coordinator will reach out to schedule an orientation call.
3. We will provide you with access to our learning resources and community platform.

If you have any questions in the meantime, please do not hesitate to reach out to your coordinator at {{coordinator_email}}.

We look forward to supporting you every step of the way.

Warm regards,
The Propela Team`,
    tags: ['onboarding', 'welcome', 'cohort'],
    status: 'Active',
    lastModified: '2024-11-15',
    usageCount: 142,
  },
  {
    id: 'tmpl-002',
    name: 'OET Reminder WhatsApp',
    category: 'WhatsApp',
    subject: null,
    body: `Hi {{nurse_name}}! Just a reminder that your OET exam is scheduled for {{date}} at {{exam_centre}}.

Please make sure you have:
- Your ID/passport ready
- Arrived at least 30 minutes early
- Reviewed the speaking section format

You have got this! Let us know if you need any last-minute support. Good luck!`,
    tags: ['oet', 'reminder', 'exam'],
    status: 'Active',
    lastModified: '2024-11-10',
    usageCount: 87,
  },
  {
    id: 'tmpl-003',
    name: 'Programme Agreement Letter',
    category: 'Letter',
    subject: null,
    body: `PROGRAMME AGREEMENT

Date: {{date}}
Participant: {{nurse_name}}
Programme: {{cohort_name}}

Dear {{nurse_name}},

This letter serves as your formal agreement to participate in the Propela International Nursing Pathway Programme as part of {{cohort_name}}.

By signing this agreement, you confirm that you:
1. Understand the programme timeline and commitments
2. Agree to the payment schedule as outlined in Schedule A
3. Will maintain regular communication with your coordinator
4. Will complete all required assessments within the specified timeframes

Programme Start Date: {{start_date}}
Expected Completion: {{end_date}}
Coordinator: {{coordinator_name}}

Please sign and return this agreement by {{deadline_date}}.

Yours sincerely,
Propela Programme Office`,
    tags: ['agreement', 'legal', 'onboarding'],
    status: 'Active',
    lastModified: '2024-10-28',
    usageCount: 64,
  },
  {
    id: 'tmpl-004',
    name: 'Interview Confirmation',
    category: 'Email',
    subject: 'Interview Confirmation - {{date}}',
    body: `Dear {{nurse_name}},

We are pleased to confirm your interview has been scheduled.

Date: {{date}}
Time: {{time}}
Format: {{interview_format}}
Duration: Approximately 30 minutes

Please ensure you have:
- A stable internet connection (for virtual interviews)
- Your CV and supporting documents ready
- A quiet space free from interruptions

The interview will cover your clinical experience, motivation for international practice, and English communication skills.

If you need to reschedule, please contact us at least 48 hours in advance.

Best regards,
{{coordinator_name}}
Propela Recruitment Team`,
    tags: ['interview', 'scheduling', 'recruitment'],
    status: 'Active',
    lastModified: '2024-11-12',
    usageCount: 53,
  },
  {
    id: 'tmpl-005',
    name: 'Non-Selection Email',
    category: 'Email',
    subject: 'Application Update - Propela Programme',
    body: `Dear {{nurse_name}},

Thank you for your interest in the Propela International Nursing Pathway Programme and for taking the time to apply for {{cohort_name}}.

After careful consideration of all applications, we regret to inform you that we are unable to offer you a place in this cohort.

{{non_selection_reason}}

We encourage you to:
- Continue developing your English proficiency
- Gain additional clinical experience
- Consider reapplying for future cohorts

We wish you all the best in your nursing career and future endeavours.

Kind regards,
Propela Admissions Team`,
    tags: ['non-selection', 'rejection', 'recruitment'],
    status: 'Active',
    lastModified: '2024-11-08',
    usageCount: 31,
  },
  {
    id: 'tmpl-006',
    name: 'Placement Confirmation',
    category: 'Email',
    subject: 'Congratulations! Your Placement is Confirmed',
    body: `Dear {{nurse_name}},

Congratulations! We are delighted to confirm that your placement has been finalised.

Placement Details:
- Employer: {{employer_name}}
- Location: {{placement_location}}
- Start Date: {{start_date}}
- Role: {{role_title}}

Next Steps:
1. Review and sign the employment contract (attached)
2. Begin your visa application process
3. Attend the pre-departure orientation on {{orientation_date}}
4. Complete mandatory compliance training

Your placement coordinator {{coordinator_name}} will be in touch shortly with detailed instructions for each step.

This is a tremendous achievement, and we are incredibly proud of your dedication. Welcome to the next chapter of your career!

Best wishes,
The Propela Team`,
    tags: ['placement', 'confirmation', 'milestone'],
    status: 'Active',
    lastModified: '2024-11-01',
    usageCount: 22,
  },
  {
    id: 'tmpl-007',
    name: 'Cohort Welcome Message',
    category: 'WhatsApp',
    subject: null,
    body: `Welcome to {{cohort_name}}! We are so excited to have you on board, {{nurse_name}}.

This is your official cohort WhatsApp group. Here you will find:
- Programme updates and announcements
- Study resources and tips
- Peer support from fellow cohort members

Group rules:
- Be respectful and supportive
- Keep messages relevant to the programme
- No spam or promotional content

Your coordinator {{coordinator_name}} will share the programme schedule shortly. Feel free to introduce yourself!`,
    tags: ['cohort', 'welcome', 'community'],
    status: 'Active',
    lastModified: '2024-10-20',
    usageCount: 45,
  },
  {
    id: 'tmpl-008',
    name: 'Follow-up SMS',
    category: 'SMS',
    subject: null,
    body: `Hi {{nurse_name}}, this is Propela. We noticed you have not yet submitted your {{document_type}}. Please upload it by {{deadline_date}} to avoid delays in your application. Need help? Reply HELP or call us on {{contact_number}}.`,
    tags: ['follow-up', 'reminder', 'documents'],
    status: 'Active',
    lastModified: '2024-11-14',
    usageCount: 198,
  },
  {
    id: 'tmpl-009',
    name: 'OET Results Notification',
    category: 'Email',
    subject: 'Your OET Results Are Available',
    body: `Dear {{nurse_name}},

We have received notification that your OET results from {{exam_date}} are now available.

Your scores:
- Listening: {{oet_listening}}
- Reading: {{oet_reading}}
- Writing: {{oet_writing}}
- Speaking: {{oet_speaking}}

Overall Result: {{oet_result}}

{{next_steps}}

Please contact your coordinator {{coordinator_name}} if you have any questions about your results or next steps.

Best regards,
Propela Academic Support`,
    tags: ['oet', 'results', 'academic'],
    status: 'Draft',
    lastModified: '2024-11-16',
    usageCount: 0,
  },
  {
    id: 'tmpl-010',
    name: 'Commitment Fee Invoice',
    category: 'Document',
    subject: null,
    body: `INVOICE

Invoice Number: {{invoice_number}}
Date: {{date}}
Due Date: {{due_date}}

Bill To:
{{nurse_name}}
{{nurse_email}}

Description: Programme Commitment Fee - {{cohort_name}}
Amount: {{amount}}

Payment Methods:
- Bank Transfer: Account details provided separately
- Online Payment: {{payment_link}}

Please ensure payment is received by {{due_date}} to secure your place in the programme.

For queries regarding this invoice, contact finance@propela.co.za

Thank you,
Propela Finance Department`,
    tags: ['finance', 'invoice', 'commitment-fee'],
    status: 'Draft',
    lastModified: '2024-11-05',
    usageCount: 0,
  },
];
