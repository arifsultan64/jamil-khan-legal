import type { HomepageSectionConfig } from '../types/portal';

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = [
  { key: 'hero', label: 'Hero & Portal Introduction', enabled: true, order: 1 },
  { key: 'featured_research', label: 'Featured Research Papers', enabled: true, order: 2 },
  { key: 'latest_articles', label: 'Latest Legal Articles', enabled: true, order: 3 },
  { key: 'recent_judgments', label: 'Recent Judgments', enabled: true, order: 4 },
  { key: 'latest_case_laws', label: 'Latest Case Laws', enabled: true, order: 5 },
  { key: 'featured_presentations', label: 'Featured Presentations', enabled: true, order: 6 },
  { key: 'popular_publications', label: 'Popular Publications', enabled: true, order: 7 },
  { key: 'categories', label: 'Browse by Categories', enabled: true, order: 8 },
  { key: 'about_author', label: 'About the Author', enabled: true, order: 9 },
  { key: 'newsletter', label: 'Newsletter Subscription', enabled: true, order: 10 },
];

export const DEFAULT_CATEGORIES = [
  { id: 'cat_constitutional_law', name: 'Constitutional Law', slug: 'constitutional-law', description: 'Constitutional interpretation, separation of powers, and fundamental rights jurisprudence.', icon: 'Scale', displayOrder: 1 },
  { id: 'cat_criminal_law', name: 'Criminal Law', slug: 'criminal-law', description: 'Substantive criminal jurisprudence, sentencing principles, and procedural safeguards.', icon: 'Shield', displayOrder: 2 },
  { id: 'cat_civil_law', name: 'Civil Law', slug: 'civil-law', description: 'Contractual obligations, property rights, tortious liability, and civil remedies.', icon: 'BookOpen', displayOrder: 3 },
  { id: 'cat_family_law', name: 'Family Law', slug: 'family-law', description: 'Personal status, guardianship, maintenance, and family courts jurisprudence.', icon: 'Users', displayOrder: 4 },
  { id: 'cat_service_law', name: 'Service Law', slug: 'service-law', description: 'Public service tribunals, disciplinary proceedings, and administrative service jurisprudence.', icon: 'Briefcase', displayOrder: 5 },
  { id: 'cat_administrative_law', name: 'Administrative Law', slug: 'administrative-law', description: 'Judicial review of executive action, natural justice, and regulatory discretion.', icon: 'Landmark', displayOrder: 6 },
  { id: 'cat_human_rights', name: 'Human Rights', slug: 'human-rights', description: 'Due process, civil liberties, access to justice, and constitutional protections.', icon: 'Compass', displayOrder: 7 },
  { id: 'cat_islamic_law', name: 'Islamic Law', slug: 'islamic-law', description: 'Usul al-Fiqh, Islamic legal maxims, and statutory codification.', icon: 'ScrollText', displayOrder: 8 },
  { id: 'cat_evidence_law', name: 'Evidence Law', slug: 'evidence-law', description: 'Admissibility, burden of proof, witness examination, and forensic standards.', icon: 'FileSearch', displayOrder: 9 },
  { id: 'cat_procedural_law', name: 'Procedural Law', slug: 'procedural-law', description: 'Civil and criminal procedure codes, limitation, and appellate jurisdiction.', icon: 'ListChecks', displayOrder: 10 },
  { id: 'cat_judicial_admin', name: 'Judicial Administration', slug: 'judicial-administration', description: 'Case management, court modernization, judicial ethics, and docket governance.', icon: 'Gavel', displayOrder: 11 },
  { id: 'cat_legal_education', name: 'Legal Education', slug: 'legal-education', description: 'Judicial training curricula, moot court advocacy, and research methodology.', icon: 'GraduationCap', displayOrder: 12 },
  { id: 'cat_international_law', name: 'International Law', slug: 'international-law', description: 'Treaty obligations, comparative public law, and transnational dispute resolution.', icon: 'Globe', displayOrder: 13 },
  { id: 'cat_academic_research', name: 'Academic Research', slug: 'academic-research', description: 'Interdisciplinary legal scholarship, empirical court studies, and doctrinal essays.', icon: 'Library', displayOrder: 14 },
  { id: 'cat_miscellaneous', name: 'Miscellaneous', slug: 'miscellaneous', description: 'General legal notes, legislative summaries, and professional commentary.', icon: 'FolderOpen', displayOrder: 15 },
];

export const DEFAULT_PROFILE_DATA = {
  id: 'main_profile',
  fullName: 'Jameel Khan',
  headline: 'Legal Researcher, Author & Academic Publications Portal',
  biography:
    'Welcome to the personal legal research and publications archive of Jameel Khan. This platform serves as a centralized digital repository for doctrinal scholarship, case law digests, analytical commentaries, seminar presentations, and legal education materials.\n\nAll biographical particulars, academic credentials, and professional appointments displayed on this page are maintained directly by the administrator through the portal CMS.',
  academicBackground:
    'Administrator-verified academic background and degrees can be updated directly from the Admin Dashboard under Author Profile.',
  professionalExperience:
    'Administrator-verified professional experience and institutional roles can be added from the Admin Dashboard.',
  judicialCareer:
    'Administrator-verified judicial or legal practice details may be entered here via the Admin Dashboard. No unverified claims are published automatically.',
  researchInterests: [
    'Constitutional Jurisprudence',
    'Principles of Natural Justice',
    'Judicial Review & Administrative Law',
    'Law of Evidence',
    'Criminal Justice Reform',
    'Statutory Interpretation',
  ],
  academicContributions:
    'Published doctrinal articles, seminar papers, training handouts, and structured legal research notes curated for judges, advocates, and law students.',
  achievements:
    'Editable directly from the Admin Dashboard.',
  profileImageUrl: '/assets/aistudio/jameel-khan_2505a7a3.jpg',
};

export const DEFAULT_SITE_SETTINGS = {
  id: 'global',
  siteName: 'Jameel Khan',
  tagline: 'Legal Research & Publications',
  heroTitle: 'Doctrinal Clarity, Judicial Research & Legal Scholarship',
  heroSubtitle:
    'A centralized digital archive of legal articles, academic research papers, case law digests, judgments, presentations, and instructional materials curated by Jameel Khan.',
  welcomeMessage:
    'This independent scholarly platform provides judges, advocates, researchers, and law students with structured access to legal commentary, comparative analyses, and educational resources.',
  logoUrl: '',
  faviconUrl: '',
  contactEmail: '',
  contactOffice: 'Published correspondence details are configured via the Admin Dashboard.',
  socialLinks: {
    linkedin: '',
    twitter: '',
    facebook: '',
    youtube: '',
    website: '',
  },
  homepageSections: DEFAULT_HOMEPAGE_SECTIONS,
  newsletterEnabled: true,
  contactFormEnabled: true,
  maxUploadSizeMb: 25,
  defaultSeoTitle: 'Jameel Khan | Legal Research & Publications',
  defaultSeoDescription:
    'Independent digital portal for legal research, case laws, judgments, scholarly articles, lectures, and presentations by Jameel Khan.',
  footerText:
    'Jameel Khan — Independent Legal Research & Academic Publications Portal. This is a personal scholarly platform and is not an official court or government website.',
  privacyPolicy:
    'We respect visitor privacy. Email addresses submitted through the newsletter subscription form or contact form are stored securely and used solely for correspondence or publication updates authorized by the portal administrator. We do not sell, rent, or distribute visitor information to third parties.',
  disclaimer:
    'DISCLAIMER: This website is a personal professional legal research and academic publications portal maintained by Jameel Khan. It is NOT an official court website, judicial registry, or government portal. Content published herein—including articles, research papers, case law notes, and educational handouts—is provided strictly for academic research, legal education, and informational purposes and does not constitute formal legal advice.',
  termsAndConditions:
    'All original articles, research papers, lecture notes, and presentations published on this portal are intended for personal academic study, legal research, and classroom reference with proper attribution to the author. Automated scraping or commercial republication without written authorization is prohibited.',
  inactivityTimeoutMinutes: 30,
};

export const DEMO_ARTICLES = [
  {
    id: 'demo_art_constitutional_law',
    title: '[Demonstration] Introduction to Constitutional Law and Structural Checks',
    slug: 'demo-introduction-to-constitutional-law',
    description:
      'Demonstration sample article exploring constitutional supremacy, separation of powers, and doctrinal frameworks for judicial interpretation.',
    content:
      '<h2>1. Foundations of Constitutional Supremacy</h2><p><strong>Demonstration Notice:</strong> This entry is sample demonstration content created for initial portal verification and can be removed in one click from the Admin Dashboard.</p><p>Constitutional law establishes the foundational architecture of public authority, delineating legislative competence, executive accountability, and independent judicial review. Across common-law and codified constitutional systems, written constitutions operate as higher law against which ordinary statutes and administrative instruments are tested.</p><h2>2. Separation of Powers and Institutional Balance</h2><p>The functional separation of legislative, executive, and judicial authority prevents the concentration of unchecked discretion. Judicial independence ensures that disputes involving citizens and the state are adjudicated impartially according to established legal standards rather than political expediency.</p><blockquote>Constitutionalism is not merely a charter of powers granted to the state; it is an enforceable covenant limiting how power may lawfully be exercised.</blockquote><h2>3. Doctrinal Methods of Interpretation</h2><table><thead><tr><th>Interpretive Approach</th><th>Primary Anchor</th><th>Judicial Application</th></tr></thead><tbody><tr><td>Textual &amp; Structural</td><td>Plain constitutional text &amp; scheme</td><td>Preserves fidelity to enacted provisions</td></tr><tr><td>Purposive</td><td>Underlying constitutional values &amp; rights</td><td>Harmonizes fundamental guarantees with modern realities</td></tr><tr><td>Harmonious Construction</td><td>Coherence across constitutional articles</td><td>Avoids rendering any provision redundant</td></tr></tbody></table><h3>Key Takeaways</h3><ul><li>Constitutional provisions are read holistically rather than in isolation.</li><li>Fundamental rights clauses are construed broadly to secure effective protection.</li><li>Limitations on rights must satisfy legality, necessity, and proportionality.</li></ul>',
    footnotes: '1. Demonstration footnote: Standard constitutional law treatise reference format.',
    references: 'Demonstration Bibliography: Comparative Constitutional Law Studies (Sample Entry).',
    categoryId: 'cat_constitutional_law',
    categoryName: 'Constitutional Law',
    tags: ['Constitutionalism', 'Separation of Powers', 'Demonstration'],
    keywords: ['constitutional law', 'judicial review', 'separation of powers'],
    featuredImage: '/src/assets/images/article_constitutional_law_1795074958098.jpg',
    readingTimeMinutes: 4,
    isFeatured: true,
    isDemo: true,
    seoTitle: 'Introduction to Constitutional Law (Demo) | Jameel Khan',
    seoDescription: 'Demonstration article on constitutional supremacy, separation of powers, and interpretive methodology.',
  },
  {
    id: 'demo_art_natural_justice',
    title: '[Demonstration] Principles of Natural Justice in Administrative Adjudication',
    slug: 'demo-principles-of-natural-justice',
    description:
      'Demonstration overview of audi alteram partem, the rule against bias, and reasoned decision-making in administrative tribunals.',
    content:
      '<h2>1. Overview of Procedural Fairness</h2><p><strong>Demonstration Notice:</strong> Sample demonstration content for layout and reading verification.</p><p>The principles of natural justice represent minimum standards of fair adjudication that apply whenever a public body or statutory authority determines rights, obligations, or legitimate interests.</p><h2>2. The Two Core Maxims</h2><ol><li><strong>Nemo judex in causa sua:</strong> No person may serve as judge in their own cause; decision-makers must be free from actual or reasonable apprehension of bias.</li><li><strong>Audi alteram partem:</strong> Every affected party must receive adequate notice of the case to be met and a meaningful opportunity to present evidence and submissions.</li></ol><h2>3. Duty to Give Reasons</h2><p>Modern administrative law increasingly treats reasoned orders as a corollary of procedural fairness, enabling affected individuals to understand the basis of adverse action and facilitating effective appellate or judicial review.</p>',
    footnotes: '1. Demonstration footnote illustrating numbered citation formatting.',
    references: 'Administrative Law & Procedural Fairness Compendium (Sample Entry).',
    categoryId: 'cat_administrative_law',
    categoryName: 'Administrative Law',
    tags: ['Natural Justice', 'Audi Alteram Partem', 'Demonstration'],
    keywords: ['natural justice', 'procedural fairness', 'bias rule'],
    featuredImage: '/src/assets/images/article_judicial_scales_1795074957380.jpg',
    readingTimeMinutes: 3,
    isFeatured: true,
    isDemo: true,
    seoTitle: 'Principles of Natural Justice (Demo) | Jameel Khan',
    seoDescription: 'Demonstration article examining audi alteram partem and the rule against bias.',
  },
  {
    id: 'demo_art_fundamental_rights',
    title: '[Demonstration] Fundamental Rights under the Constitution of Pakistan',
    slug: 'demo-fundamental-rights-constitution-of-pakistan',
    description:
      'Demonstration doctrinal survey of Part II, Chapter 1 of the Constitution of Pakistan, examining enforceability and constitutional remedies.',
    content:
      '<h2>1. Constitutional Architecture of Fundamental Rights</h2><p><strong>Demonstration Notice:</strong> Sample demonstration content intended solely to illustrate portal features.</p><p>Part II, Chapter 1 (Articles 8 to 28) of the Constitution of Pakistan guarantees an extensive catalogue of civil, political, and due-process protections. Article 8 renders any law inconsistent with fundamental rights void to the extent of inconsistency.</p><h2>2. Due Process and Access to Justice</h2><p>The constitutional guarantee of fair trial and due process (Article 10-A) reinforces procedural safeguards across civil, criminal, and administrative proceedings, requiring impartial tribunals and reasoned adjudication.</p><h2>3. Constitutional Enforcement Mechanisms</h2><p>Superior courts exercise constitutional jurisdiction to enforce fundamental rights, ensuring that legislative and executive actions remain bounded by constitutional limits.</p>',
    categoryId: 'cat_constitutional_law',
    categoryName: 'Constitutional Law',
    tags: ['Fundamental Rights', 'Article 10-A', 'Demonstration'],
    keywords: ['fundamental rights', 'constitution of pakistan', 'due process'],
    featuredImage: '/src/assets/images/article_constitutional_law_1795074958098.jpg',
    readingTimeMinutes: 4,
    isFeatured: false,
    isDemo: true,
  },
  {
    id: 'demo_art_evidence_law',
    title: '[Demonstration] Principles of Evidence: Relevancy, Admissibility & Weight',
    slug: 'demo-principles-of-evidence',
    description:
      'Demonstration study distinguishing relevancy, legal admissibility, and probative evaluation in trial proceedings.',
    content:
      '<h2>1. Relevancy vs. Admissibility</h2><p><strong>Demonstration Notice:</strong> Sample demonstration article for testing category filtering and search.</p><p>A foundational distinction in the law of evidence separates logical relevancy from statutory admissibility. While relevancy concerns probative connection to facts in issue, admissibility governs whether the court is legally permitted to receive the material.</p><h2>2. Standard of Proof</h2><p>Civil disputes ordinarily turn upon preponderance of probabilities, whereas criminal liability demands proof beyond reasonable doubt—reflecting the gravity of penal sanctions.</p>',
    categoryId: 'cat_evidence_law',
    categoryName: 'Evidence Law',
    tags: ['Evidence', 'Admissibility', 'Burden of Proof', 'Demonstration'],
    keywords: ['law of evidence', 'admissibility', 'standard of proof'],
    featuredImage: '/src/assets/images/article_judicial_scales_1795074957380.jpg',
    readingTimeMinutes: 3,
    isFeatured: false,
    isDemo: true,
  },
];

export const DEMO_RESEARCH_PAPERS = [
  {
    id: 'demo_res_judicial_review',
    title: '[Demonstration] Judicial Review and Administrative Action: Proportionality vs. Wednesbury',
    slug: 'demo-judicial-review-and-administrative-action',
    abstract:
      'Demonstration research paper examining the doctrinal evolution of judicial review of administrative discretion, comparing traditional unreasonableness review with structured proportionality analysis.',
    description: 'Demonstration academic paper on standards of administrative judicial review.',
    introduction:
      '<p><strong>Demonstration Notice:</strong> This is sample research content demonstrating the structured academic layout (Abstract, Introduction, Methodology, Analysis, Findings, Conclusion, Bibliography).</p><p>Judicial review of administrative action balances two foundational imperatives: respecting statutory delegation to specialized executive bodies while safeguarding individuals against ultra vires, arbitrary, or disproportionate decisions.</p>',
    methodology:
      '<p>Comparative doctrinal methodology surveying primary statutory frameworks, appellate jurisprudence, and comparative common-law standards of substantive review.</p>',
    analysis:
      '<p>Whereas classical irrationality review asks whether a decision is so outrageous in its defiance of logic that no sensible authority could reach it, proportionality imposes a disciplined four-stage inquiry: legitimate aim, rational connection, minimal impairment, and fair balance.</p>',
    findings:
      '<p>Structured proportionality enhances transparency in judicial reasoning when fundamental rights are implicated, while deferential reasonableness remains appropriate for polycentric policy allocation.</p>',
    conclusion:
      '<p>Clarifying the threshold between procedural illegality, irrationality, and proportionality strengthens doctrinal predictability for both administrative decision-makers and reviewing courts.</p>',
    bibliography:
      '<p>Demonstration Bibliography: Comparative Public Law Monographs &amp; Administrative Jurisprudence Reviews (Sample Entry).</p>',
    categoryId: 'cat_administrative_law',
    categoryName: 'Administrative Law',
    tags: ['Judicial Review', 'Proportionality', 'Demonstration'],
    keywords: ['judicial review', 'administrative action', 'proportionality'],
    featuredImage: '/src/assets/images/hero_legal_library_1795074956712.jpg',
    isFeatured: true,
    isDemo: true,
  },
  {
    id: 'demo_res_statutory_interpretation',
    title: '[Demonstration] Interpretation of Statutes: Harmonizing Literal Text and Legislative Purpose',
    slug: 'demo-interpretation-of-statutes',
    abstract:
      'Demonstration paper analyzing literal, mischief, and purposive canons of statutory construction in modern legislative drafting.',
    description: 'Demonstration paper on statutory construction methodology.',
    introduction:
      '<p><strong>Demonstration Notice:</strong> Sample academic paper for demonstration purposes.</p><p>Statutory interpretation lies at the heart of adjudication. Courts regularly navigate tensions between enacted text, statutory context, and remedial legislative intent.</p>',
    methodology: '<p>Doctrinal synthesis of classical interpretive canons and presumptions against retrospective penal operation.</p>',
    analysis: '<p>Modern interpretive practice treats text, context, and statutory purpose as mutually reinforcing rather than mutually exclusive inquiries.</p>',
    findings: '<p>Consistent application of contextual canons reduces interpretive ambiguity and enhances legal certainty.</p>',
    conclusion: '<p>Principled statutory interpretation preserves legislative supremacy while upholding constitutional norms.</p>',
    bibliography: '<p>Demonstration Bibliography: Statutory Interpretation Reference Texts.</p>',
    categoryId: 'cat_academic_research',
    categoryName: 'Academic Research',
    tags: ['Statutory Interpretation', 'Canons', 'Demonstration'],
    keywords: ['interpretation of statutes', 'purposive approach', 'literal rule'],
    featuredImage: '/src/assets/images/article_constitutional_law_1795074958098.jpg',
    isFeatured: true,
    isDemo: true,
  },
];

export const DEMO_CASE_LAWS = [
  {
    id: 'demo_case_criminal_justice',
    title: '[Demonstration] Case Digest Template: Safeguards in the Criminal Justice System',
    slug: 'demo-case-digest-criminal-justice-safeguards',
    caseNumber: 'DEMO-REF-001',
    courtName: 'Demonstration Reference Court (Sample)',
    citation: 'DEMO 2026 REF 01',
    year: 2026,
    benchDetails: 'Demonstration Record — Replace with verified judicial citation via Admin CMS',
    subjectMatter: 'Criminal Justice System & Fair Trial Safeguards',
    legalPrinciples:
      '<ul><li>Demonstration principle: Presumption of innocence governs throughout criminal trial proceedings.</li><li>Procedural irregularities affecting substantial justice require careful appellate scrutiny.</li></ul>',
    statutoryProvisions: ['Demonstration Statutory Provision A', 'Demonstration Procedural Section B'],
    headnotes:
      '<p><strong>Demonstration Notice:</strong> This is a template demonstration record illustrating the Case Law Database schema. No real judicial decision or citation has been fabricated.</p>',
    observations:
      '<p>Use the Admin Dashboard to enter verified case titles, case numbers, official citations, statutory provisions, and attached PDFs.</p>',
    description: 'Demonstration case law record showing structured fields, headnotes, and statutory provisions.',
    categoryId: 'cat_criminal_law',
    categoryName: 'Criminal Law',
    tags: ['Criminal Justice', 'Fair Trial', 'Demonstration'],
    keywords: ['criminal justice system', 'fair trial', 'case digest'],
    isFeatured: true,
    isDemo: true,
  },
];

export const DEMO_JUDGMENTS = [
  {
    id: 'demo_judg_template',
    title: '[Demonstration] Judgment Repository Template: Administrative Review',
    slug: 'demo-judgment-repository-template',
    caseNumber: 'DEMO-JUDG-001',
    court: 'Demonstration Reference Tribunal (Sample)',
    judgmentDate: '2026-01-15',
    year: 2026,
    citation: 'DEMO-J-2026-01',
    subject: 'Administrative Discretion and Duty to Record Reasons',
    description:
      'Demonstration judgment record illustrating summary, legal issues, operative outcome, and PDF attachment workflow.',
    legalIssues:
      '<p><strong>Demonstration Notice:</strong> Sample record only. Actual judgments and official PDFs are uploaded directly by Jameel Khan through the Admin Dashboard.</p><p>Issue: Whether an administrative order affecting civil rights must disclose intelligible reasons on the record.</p>',
    finalDecision:
      '<p>Demonstration operative note: Illustrates structured display of final orders and operative outcomes.</p>',
    content: '<p>Full demonstration judgment text placeholder for layout testing.</p>',
    categoryId: 'cat_judicial_admin',
    categoryName: 'Judicial Administration',
    tags: ['Judgment Template', 'Administrative Law', 'Demonstration'],
    keywords: ['judgment', 'reasoned order', 'demonstration'],
    isFeatured: true,
    isDemo: true,
  },
];

export const DEMO_PRESENTATIONS = [
  {
    id: 'demo_pres_constitutional',
    title: '[Demonstration] Seminar Deck: Methodologies in Legal Research & Citation',
    slug: 'demo-seminar-deck-legal-research-methodology',
    description:
      'Demonstration presentation entry showing slide deck metadata, file format indicators, and educational resource linking.',
    topic: 'Legal Research & Academic Writing',
    fileName: 'Demonstration_Legal_Research_Deck.pptx',
    fileType: 'PPTX',
    fileSizeBytes: 1450000,
    featuredImage: '/src/assets/images/presentation_seminar_hall_1795074956352.jpg',
    categoryId: 'cat_legal_education',
    categoryName: 'Legal Education',
    tags: ['Presentation', 'Research Methodology', 'Demonstration'],
    keywords: ['legal research', 'presentation', 'seminar'],
    isFeatured: true,
    isDemo: true,
  },
];

export const DEMO_LECTURES = [
  {
    id: 'demo_lec_statutes',
    title: '[Demonstration] Lecture Notes: Foundations of Statutory Construction',
    slug: 'demo-lecture-notes-statutory-construction',
    resourceKind: 'lecture_notes' as const,
    description:
      'Demonstration lecture notes prepared for law students and judicial academy seminars covering primary canons of construction.',
    content:
      '<h2>Lecture Outline (Demonstration)</h2><p><strong>Demonstration Notice:</strong> Sample lecture handout for testing the Lectures &amp; Educational Resources module.</p><ul><li>Part I: Literal meaning and statutory context</li><li>Part II: Harmonious reading of general and special statutes</li><li>Part III: Presumptions in penal and fiscal enactments</li></ul>',
    categoryId: 'cat_legal_education',
    categoryName: 'Legal Education',
    tags: ['Lecture Notes', 'Statutory Interpretation', 'Demonstration'],
    keywords: ['lecture notes', 'statutory construction'],
    isFeatured: true,
    isDemo: true,
  },
];

export const DEMO_RESOURCES = [
  {
    id: 'demo_res_guidelines',
    title: '[Demonstration] Academic Handout: Structuring Legal Case Briefs',
    slug: 'demo-academic-handout-legal-case-briefs',
    resourceKind: 'academic_handout' as const,
    description:
      'Demonstration educational handout outlining facts, procedural posture, issues, holding, and ratio decidendi.',
    content:
      '<h2>Standard Case Brief Structure (Demonstration)</h2><p>A concise analytical template for law students and legal researchers summarizing judicial decisions systematically.</p><ol><li>Caption &amp; Citation</li><li>Material Facts</li><li>Procedural History</li><li>Questions Presented</li><li>Holding &amp; Ratio Decidendi</li></ol>',
    categoryId: 'cat_academic_research',
    categoryName: 'Academic Research',
    tags: ['Case Brief', 'Handout', 'Demonstration'],
    keywords: ['case brief', 'legal education', 'handout'],
    isFeatured: true,
    isDemo: true,
  },
];
