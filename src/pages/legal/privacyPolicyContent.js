// Single source of truth for the Privacy Policy.
// Both the on-screen page (PrivacyPolicy.jsx) and the downloadable PDF are
// generated from this data so the two can never drift apart.
//
// NOTE for maintainers: fields wrapped like [[…]] are placeholders that the
// programme / legal / data-protection team must confirm before this policy is
// treated as final and published.

export const POLICY_META = {
  title: "Privacy Policy",
  programme: "CMAM Programme — SAM Hotspot Identification & Micro-Targeting",
  operator: "Institute of Economic Growth (IEG), Delhi",
  collaboration: "in collaboration with the concerned State Governments",
  version: "2.0",
  contactEmail: "samtsu@iegindia.org",
  grievanceOfficer: "Dr. Rakesh Kumar, Senior Consultant – SAM Hotspot Project",
};

// Each section: { id, heading, body: [ paragraph | { list: [...] } | { subheading, ... } ] }
// A "body" item is either a plain string (paragraph) or an object with a `list` array.
export const POLICY_SECTIONS = [
  {
    id: "introduction",
    heading: "1. Introduction",
    body: [
      "This Privacy Policy explains how the CMAM Programme platform (the “Platform”, “we”, “us” or “our”) collects, uses, stores, shares and protects information when you access or use this application. The Platform supports the identification of hot-spots and micro-targeting of interventions for child malnutrition, focusing on wasting (Severe Acute Malnutrition, “SAM”) among under-five children.",
      "The Platform is operated by the Institute of Economic Growth (IEG), Delhi, in collaboration with the concerned State Governments, as part of the Community-based Management of Acute Malnutrition (CMAM) programme.",
      "By logging in and using the Platform, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with any part of this policy, please do not use the Platform.",
    ],
  },
  {
    id: "who-we-are",
    heading: "2. Who We Are (Data Controller)",
    body: [
      "The Institute of Economic Growth (IEG) is the data controller responsible for personal data processed through this Platform. IEG determines the purposes and means of processing and is accountable for safeguarding the data collected under the programme.",
      "For any questions about this policy or about how your data is handled, you may contact us using the details in the “Contact & Grievance Redressal” section below.",
    ],
  },
  {
    id: "information-we-collect",
    heading: "3. Information We Collect",
    body: [
      "We collect only the information needed to operate the programme and improve child-nutrition services. The categories of information are:",
      {
        subheading: "3.1 Account & user information",
        list: [
          "Name, username and role (Admin, State Admin, IEG or Surveyor)",
          "Email address and/or mobile number used for the account and for support",
          "Assigned geography (state, district, block and village) associated with your role",
          "Authentication data such as your password (stored only in encrypted/hashed form)",
        ],
      },
      {
        subheading: "3.2 Survey & programme data (field data)",
        list: [
          "Household and respondent details recorded during surveys (e.g. caregiver / respondent information)",
          "Data about under-five children, including age, sex and anthropometric measurements (such as weight, height/length, mid-upper-arm circumference (MUAC) and presence of oedema)",
          "Infant and young child feeding practices, health, immunization, referral and treatment-related information",
          "Anganwadi Centre (AWC) / facility details and equipment availability",
          "Knowledge and skill assessments of frontline workers (e.g. ANM, CHO, AWW)",
        ],
      },
      {
        subheading: "3.3 Location information",
        list: [
          "Approximate or precise GPS coordinates of a survey location, where you or your device permit location access, so that records can be mapped to the correct area for hot-spot analysis",
        ],
      },
      {
        subheading: "3.4 Device, technical & usage information",
        list: [
          "Device and browser type, operating system and similar technical attributes",
          "Log and usage information, including actions taken in the app and timestamps (audit logs)",
          "Data cached locally on your device to support offline data collection",
        ],
      },
      {
        subheading: "3.5 Error reports (only with your consent)",
        list: [
          "If you choose to send an error report, we may share error details, the form data you entered (excluding sensitive personal data), your name, email and role, and technical details, with our support team via WhatsApp. This is done only after you give explicit, revocable consent.",
        ],
      },
    ],
  },
  {
    id: "children-data",
    heading: "4. Data Relating to Children",
    body: [
      "The programme necessarily involves information about under-five children and their health, which is sensitive personal data. Such information is collected from, and with the consent of, a parent, caregiver or responsible adult, and is used strictly for child-health and nutrition programme purposes.",
      "We take additional care to limit access to children’s data, to collect only what is necessary, and to retain it only for as long as required for the programme and any applicable legal or reporting obligations.",
    ],
  },
  {
    id: "how-we-use",
    heading: "5. How We Use Your Information",
    body: [
      "We use the information described above to:",
      {
        list: [
          "Identify malnutrition hot-spots and micro-target interventions for under-five children",
          "Enable field data collection, including offline collection and later synchronization",
          "Authenticate users and enforce role-based access to features and data",
          "Generate dashboards, analytics and reports for programme monitoring and decision-making",
          "Provide support, resolve errors and improve the reliability and usability of the Platform",
          "Maintain audit logs for security, accountability and data-quality purposes",
          "Comply with applicable legal, regulatory and programme-reporting requirements",
        ],
      },
      "We do not sell your personal data, and we do not use it for advertising.",
    ],
  },
  {
    id: "legal-basis",
    heading: "6. Legal Basis & Consent",
    body: [
      "We process personal data on the basis of the consent of users and of survey respondents/caregivers, and to carry out a child-health programme conducted in the public interest by the concerned authorities and their partners.",
      "Where processing relies on consent, that consent may be withdrawn at any time, as described in “Your Rights & Choices” below. Withdrawing consent does not affect processing already carried out before the withdrawal.",
    ],
  },
  {
    id: "sharing",
    heading: "7. How We Share Information",
    body: [
      "Access to data is limited to those who need it for the programme. We may share information with:",
      {
        list: [
          "Authorized programme personnel and administrators, according to their role and assigned geography",
          "IEG and the concerned State Government / programme authorities, for programme implementation, monitoring and evaluation",
          "Service providers who support the Platform under confidentiality obligations (for example, cloud hosting and technical/IT support), acting on our instructions",
          "Third-party services strictly to deliver a feature you use — for example, WhatsApp when you choose to send an error report, and map providers to display locations",
          "Authorities or other parties where required by applicable law, regulation or legal process",
        ],
      },
      "We require that anyone processing data on our behalf protects it consistently with this policy and applicable law.",
    ],
  },
  {
    id: "storage-security",
    heading: "8. Data Storage, Retention & Security",
    body: [
      "Programme data is stored on secured servers (including cloud infrastructure) with access controls. We use measures such as encrypted transmission, hashed passwords, role-based access control and audit logging to help protect data against unauthorized access, alteration or disclosure.",
      "To support offline field work, some data may be temporarily stored on your device and synchronized to the server when connectivity is available. Please keep your device secure and sign out on shared devices.",
      "We retain personal data only for as long as necessary for the purposes described in this policy and to meet legal, programme-reporting and audit obligations, after which it is deleted or anonymized.",
      "No method of transmission or storage is completely secure; while we work to protect your information, we cannot guarantee absolute security.",
    ],
  },
  {
    id: "cookies-storage",
    heading: "9. Cookies & Local Storage",
    body: [
      "The Platform uses browser storage (such as local storage and, where applicable, cookies) rather than advertising trackers. These are used to:",
      {
        list: [
          "Keep you signed in and maintain your session (for example, an access token)",
          "Cache form and reference data so the app works offline",
          "Remember preferences such as your selected language",
          "Record your choice about error-reporting consent",
        ],
      },
      "Clearing your browser storage will sign you out and remove locally cached data, including any unsynchronized offline entries.",
    ],
  },
  {
    id: "your-rights",
    heading: "10. Your Rights & Choices",
    body: [
      "Subject to applicable law, you may:",
      {
        list: [
          "Request access to the personal data we hold about you",
          "Request correction of inaccurate or incomplete data",
          "Withdraw a consent you previously gave (for example, error-reporting consent), or object to certain processing",
          "Request deletion of your data where there is no overriding legal or programme requirement to retain it",
          "Raise a grievance about how your data is handled",
        ],
      },
      "To exercise any of these rights, contact us using the details below. We may need to verify your identity before acting on a request. Surveyors and field users should also contact their programme administrator for account-related changes.",
    ],
  },
  {
    id: "third-party",
    heading: "11. Third-Party Services & Links",
    body: [
      "The Platform relies on certain third-party services to function, such as cloud hosting, map/location display and, where you choose, WhatsApp for support and error reporting. These services process data under their own terms and privacy policies. We encourage you to review the privacy practices of any third-party service you interact with. We are not responsible for the content or privacy practices of external websites linked from the Platform.",
    ],
  },
  {
    id: "changes",
    heading: "12. Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time to reflect changes in the Platform, our practices, or legal requirements. The “Last updated” date at the top of this policy indicates when it was last revised. Material changes will be communicated through the Platform where appropriate. Your continued use of the Platform after an update constitutes acknowledgement of the revised policy.",
    ],
  },
  {
    id: "contact",
    heading: "13. Contact & Grievance Redressal",
    body: [
      "If you have questions, requests or complaints regarding this Privacy Policy or your personal data, please contact:",
      {
        list: [
          "Operator: Institute of Economic Growth (IEG), Delhi",
          "Programme: CMAM Programme — SAM Hotspot Project",
          "Email: samtsu@iegindia.org",
          "Grievance Officer: Dr. Rakesh Kumar, Senior Consultant – SAM Hotspot Project",
        ],
      },
      "We will acknowledge and address grievances within a reasonable time and in accordance with applicable law.",
    ],
  },
];
