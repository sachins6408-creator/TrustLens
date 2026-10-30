// Category-aware review comment generator for synthetic benchmark data
// Produces varied, realistic, and non-repetitive customer feedback.

const SENTENCE_BANKS = {
  'Government Services': {
    positive: [
      'The portal was responsive and application tracking was transparent from start to finish.',
      'Smooth online form submission with instant SMS confirmation and clear instructions.',
      'Document verification was processed quickly without requiring an in-person office visit.',
      'Significant improvement in the user interface and digital certificate download speed.',
      'Secure payment gateway for nominal government fees and received the receipt instantly.',
      'The automated status updates kept me informed throughout the approval stages.',
      'Helpdesk grievance system resolved my query within two working days.'
    ],
    moderate: [
      'The service works as expected but the website slows down considerably during peak office hours.',
      'Application was completed successfully, though some instructions regarding document sizes were confusing.',
      'Functional portal, but OTP delivery experienced a slight delay during authentication.',
      'Standard government portal experience; does the job but could use a more mobile-friendly design.',
      'Processing took slightly longer than estimated, but received the official acknowledgment without errors.'
    ],
    risky: [
      'Portal frequently times out during payment transactions, resulting in deducted fees without confirmation.',
      'Severe server errors when trying to upload PDF identity proofs during peak daytime hours.',
      'Unresponsive grievance ticketing system with repetitive automated rejection messages.',
      'Extremely slow processing speed and lack of clear status updates on the pending application.'
    ]
  },
  'News and Media': {
    positive: [
      'Well-researched investigative reporting with transparent source citations and minimal sensationalism.',
      'Balanced editorial coverage with comprehensive background analysis on national affairs.',
      'Clean reading layout with fast page load times and unobtrusive subscription banners.',
      'Dependable fact-checking section that clarifies breaking news rumors effectively.',
      'High-quality journalism with thorough economic data charts and expert guest opinions.',
      'Excellent digital archive access and well-organized topic categories for readers.',
      'Thoughtful opinion pieces that represent diverse perspectives without clickbait headlines.'
    ],
    moderate: [
      'Good article depth, though the mobile web version contains slightly too many auto-playing video ads.',
      'Informative news coverage, but breaking news notifications can occasionally be redundant.',
      'Decent reporting quality, although some opinion columns lean heavily toward single viewpoints.',
      'Readable portal, but the paywall activates rather quickly compared to other publications.'
    ],
    risky: [
      'Excessive clickbait headlines that mislead readers regarding the actual story content.',
      'Intrusive advertising pop-ups make reading nearly impossible on mobile devices.',
      'Unverified rumors reported as breaking news without adequate corroboration or retractions.',
      'Heavy editorial bias with frequent uncorrected factual inaccuracies in published reports.'
    ]
  },
  'College and University Websites': {
    positive: [
      'World-class academic environment with distinguished faculty and exceptional laboratory infrastructure.',
      'The student intranet and LMS portal make submitting assignments and checking grades very convenient.',
      'Outstanding campus placements with reputed multinational technology and consulting firms.',
      'Transparent admission procedures and comprehensive course curriculum aligned with industry standards.',
      'Excellent digital library access providing thousands of international research journal subscriptions.',
      'Strong research culture with generous funding for student innovation projects and conferences.',
      'Supportive mentorship from professors and active student clubs fostering holistic development.'
    ],
    moderate: [
      'Solid academic standards, though the student administration portal experiences slowdowns during exam registrations.',
      'Good laboratory equipment, but hostel maintenance and campus dining options have room for improvement.',
      'Reputed faculty, though class sizes in foundational lectures can be quite large for individual doubts.',
      'Fair placement support, although off-campus internship coordination could be more proactive.'
    ],
    risky: [
      'Misleading placement statistics advertised during admissions do not match ground reality.',
      'Severe administrative delays in issuing grade sheets, official transcripts, and degree certificates.',
      'Outdated curriculum with inadequate practical lab sessions and unresponsive student support.',
      'High tuition fees without corresponding campus infrastructure or career guidance support.'
    ]
  },
  'E-Commerce': {
    positive: [
      'Fast delivery ahead of schedule and the item arrived in sturdy, tamper-proof packaging.',
      'Product quality matched the catalogue images accurately. Transparent pricing with no surprise charges.',
      'Seamless checkout experience with instant UPI payment confirmation and live courier tracking.',
      'Hassle-free return and refund process when I requested a size exchange.',
      'Genuine branded merchandise with valid manufacturer warranty cards included in the box.',
      'Competitive discounts during seasonal sales and excellent customer service assistance.',
      'Accurate sizing guide and detailed customer reviews helped me make the right purchase decision.'
    ],
    moderate: [
      'Product arrived in good condition, although the delivery was delayed by two days beyond the estimate.',
      'Reasonable pricing, but customer support took longer than expected to answer my return query.',
      'Decent shopping experience, though packaging was slightly crushed during transit.',
      'Average delivery timeframe; product quality is satisfactory for the price paid.'
    ],
    risky: [
      'Received a substandard item that clearly differed from the seller\'s product description.',
      'Refund was denied despite returning the defective merchandise within the stated policy window.',
      'Extremely poor customer support that ignored repeated complaint tickets regarding missing items.',
      'Hidden handling and packaging fees were added right at the final payment step.'
    ]
  },
  'Financial Services': {
    positive: [
      'Robust security with instant two-factor authentication alerts for every account transaction.',
      'Intuitive net banking interface allowing effortless fund transfers and recurring deposit creation.',
      'Zero downtime on UPI and IMPS transfers, with quick settlement into the beneficiary account.',
      'Helpful relationship manager who assisted in resolving my KYC verification promptly.',
      'Transparent statement breakdowns with zero hidden service charges or surprise deductions.',
      'Smooth digital onboarding process with paperless video KYC completed in minutes.',
      'High-yield investment options and comprehensive portfolio tracking tools on the web portal.'
    ],
    moderate: [
      'Banking portal is secure, but the session timeout interval is a bit too short during complex tasks.',
      'Transactions are reliable, though customer care phone wait times can be frustratingly long.',
      'Good banking app, but quarterly maintenance schedules occasionally interrupt weekend operations.',
      'Fair credit card reward redemption options, though the catalogue takes time to update.'
    ],
    risky: [
      'Unexplained debit deductions without clear transaction descriptions or prior SMS notification.',
      'Account was temporarily blocked due to false fraud flags and customer support was unreachable.',
      'Confusing fee schedule with excessive penalties for minor balance fluctuations.',
      'Glitchy mobile app that crashes during high-value wire transfers and bill payments.'
    ]
  },
  'Travel & Booking': {
    positive: [
      'Seamless booking process with instant electronic ticket confirmation sent via email and WhatsApp.',
      'Clear fare breakdown displaying airline taxes, baggage allowances, and cancellation penalties.',
      'Hotel check-in was smooth and the property amenities matched the online listing photos.',
      'Flexible date change feature saved me significant penalty charges when my plans changed.',
      'Easy seat selection and meal pre-booking options with reliable payment processing.',
      'Competitive hotel package deals with verified guest ratings and location proximity filters.',
      'Responsive round-the-clock booking support assisted with a midnight flight rescheduling.'
    ],
    moderate: [
      'Booking was confirmed instantly, but convenience fees charged during final checkout were high.',
      'Satisfactory travel experience, though customer support took over an hour to process a refund request.',
      'Decent flight aggregator, but cancellation refund timelines could be communicated more clearly.',
      'Standard booking service; accurate itinerary details but limited free cancellation windows.'
    ],
    risky: [
      'Flight was rescheduled without timely alert, leaving travelers stranded at the terminal.',
      'Hotel refused to honor the confirmed reservation voucher upon arrival due to overbooking.',
      'Excessive hidden cancellation charges that wiped out almost the entire booking amount.',
      'Unresponsive customer helpline when travelers required urgent emergency booking modifications.'
    ]
  },
  'Food & Dining': {
    positive: [
      'Food arrived piping hot with spill-proof packaging and tamper-evident safety seals.',
      'Order accuracy was spot-on with all customized spice instructions followed by the kitchen.',
      'Fast doorstep delivery within 30 minutes and accurate live delivery partner tracking.',
      'Fresh ingredients, generous portion sizes, and hygienic food preparation standards.',
      'App offers attractive dining discounts and seamless payment integration with food wallets.',
      'Clean restaurant ambiance with courteous waitstaff and prompt table reservation.',
      'Delicious flavors and authentic culinary preparations that justify the premium menu pricing.'
    ],
    moderate: [
      'Tasty dishes, though delivery took about 15 minutes longer than the promised time slot.',
      'Food quality was good, but portion sizes for curries were slightly on the smaller side.',
      'Decent dining experience, although peak weekend crowds resulted in noticeable delays.',
      'Standard meal delivery; well-packaged but the food had cooled down slightly upon arrival.'
    ],
    risky: [
      'Food arrived cold and spilled inside the bag due to careless handling and poor packing.',
      'Missing dishes from the order and customer support offered only partial automated vouchers.',
      'Severe hygiene concerns with undercooked ingredients causing food safety issues.',
      'Disappointing taste and exorbitant delivery surcharges that made the meal overpriced.'
    ]
  },
  'Healthcare': {
    positive: [
      'Professional doctors who listened patiently to medical symptoms and explained treatment options clearly.',
      'Clean, modern clinical facilities with sanitized diagnostic equipment and organized queue management.',
      'Fast digital lab test report delivery with accurate diagnostic parameters and doctor remarks.',
      'Seamless online appointment booking with zero waiting room delays at the clinic.',
      'Secure health records portal allowing instant download of past prescriptions and blood reports.',
      'Compassionate nursing staff and transparent billing for all medical consultations and tests.',
      'Reliable home sample collection with punctual phlebotomists adhering to sterile protocols.'
    ],
    moderate: [
      'Competent medical advice, though the clinic waiting room was crowded despite prior booking.',
      'Diagnostics were accurate, but receiving the final pathology report took until late evening.',
      'Good specialist doctors, though follow-up consultation slots are difficult to book quickly.',
      'Standard hospital consultation; satisfactory care but consultation fees are relatively high.'
    ],
    risky: [
      'Inaccurate diagnostic lab report that caused unnecessary anxiety until retested elsewhere.',
      'Hidden consultation and procedure fees added to the hospital bill without prior disclosure.',
      'Rude front desk staff and doctors who rushed through consultations without reviewing patient history.',
      'Prescribed medicines were unavailable at the in-house pharmacy and no alternatives were offered.'
    ]
  },
  'Technology': {
    positive: [
      'High-performance cloud infrastructure with 99.99% uptime and low-latency API response times.',
      'Comprehensive developer documentation with practical SDK examples and active community forums.',
      'Robust security features including role-based access control, encryption at rest, and audit logs.',
      'Scales effortlessly under sudden traffic spikes without throttling or unexpected service degradation.',
      'Intuitive admin dashboard with real-time telemetry metrics, error tracking, and alerting.',
      'Seamless continuous integration deployments with automated rollbacks on build failures.',
      'Responsive enterprise technical support that assisted with complex architecture migrations.'
    ],
    moderate: [
      'Reliable platform capabilities, though the initial configuration curve is steep for beginners.',
      'Good developer tooling, but occasional minor service latency noticed during peak US working hours.',
      'Capable cloud features, though pricing scales quickly once bandwidth quotas are exceeded.',
      'Solid API performance, but documentation for advanced enterprise features could be more detailed.'
    ],
    risky: [
      'Unscheduled service outages during business hours with vague status page explanations.',
      'Billing anomalies with unexpected resource usage charges and unresponsive billing support.',
      'Glitchy SDK releases that introduced breaking changes without proper deprecation warnings.',
      'Poor technical documentation with broken code snippets and stale community tutorials.'
    ]
  },
  'Entertainment': {
    positive: [
      'Extensive streaming catalogue with 4K HDR playback and Dolby Atmos surround sound support.',
      'Flawless streaming performance with zero buffering even on moderate broadband connections.',
      'Smart recommendation algorithm that consistently suggests captivating shows based on viewing history.',
      'Clean cross-device resume functionality allowing smooth transitions between phone and smart TV.',
      'Intuitive parental controls and multiple individual user profiles under a single family subscription.',
      'High-quality audio bitrate and offline download support for uninterrupted travel listening.',
      'Regular additions of original series, critically acclaimed documentaries, and regional cinema.'
    ],
    moderate: [
      'Great content selection, though the subscription renewal price increased noticeably this year.',
      'Good streaming quality, but the search filter interface can occasionally feel cluttered.',
      'Entertaining catalog, though some older licensed movies rotate out of the platform too quickly.',
      'Decent streaming experience, though regional subtitle synchronization has occasional minor errors.'
    ],
    risky: [
      'Frequent video stuttering and playback errors despite having high-speed fiber internet.',
      'Difficult cancellation process with recurring monthly charges billed after subscription termination.',
      'Intrusive unskippable promotional ads appearing repeatedly during paid tier playback.',
      'Buggy TV application that frequently freezes and logs users out unexpectedly.'
    ]
  },
  'Social Media': {
    positive: [
      'Great platform for connecting with like-minded professional communities and industry experts.',
      'Strong privacy controls allowing granular control over who can view and comment on posts.',
      'Clean chronological feed option without aggressive algorithmic manipulation or spam.',
      'Rich multimedia sharing features supporting high-resolution images, long-form articles, and video.',
      'Effective content moderation tools that swiftly remove abusive accounts and harassment.',
      'Intuitive direct messaging interface with end-to-end encryption for private conversations.',
      'Inspiring creative community with vibrant discussions, helpful feedback, and organic reach.'
    ],
    moderate: [
      'Engaging social features, but the mobile app consumes considerable battery and background data.',
      'Good discussion groups, though algorithmic recommendations sometimes surface clickbait trends.',
      'Useful networking tool, but notification settings require manual tweaking to avoid alert fatigue.',
      'Decent social platform, though occasional sponsored promotional posts interrupt user feeds.'
    ],
    risky: [
      'Rampant spam bots and impersonation accounts with sluggish response from safety moderation.',
      'Opaque account suspensions without specific violation reasons or human appeal mechanisms.',
      'Excessive tracking of user browsing data and sharing with third-party advertising brokers.',
      'Toxic community interactions that go unpenalized despite multiple harassment reports.'
    ]
  },
  'Other': {
    positive: [
      'Reliable service provider delivering consistent quality and prompt customer communication.',
      'Transparent terms of service with clear pricing policies and dependable user experience.',
      'Secure portal operations with attentive support team resolving inquiries efficiently.',
      'High standard of operational reliability that exceeded initial expectations.'
    ],
    moderate: [
      'Satisfactory platform overall; meets basic requirements but has room for modern interface improvements.',
      'Standard service execution with reasonable turnaround time, though support response could be faster.',
      'Decent user experience for routine tasks with occasional minor navigation quirks.'
    ],
    risky: [
      'Inconsistent service quality and unhelpful support representatives when issues arose.',
      'Hidden fees and unclear cancellation policies that caused unnecessary disputes.',
      'Unreliable performance with frequent service delays and lack of operational transparency.'
    ]
  }
};

const SENTIMENT_PREFIXES = {
  positive: [
    'Impressive experience overall. ',
    'Highly satisfied with this platform. ',
    'Reliable and well-maintained service. ',
    'Consistently positive experience. ',
    'Exceeded expectations in key areas. ',
    'A dependable choice in this category. ',
    'Very pleased with the performance. '
  ],
  moderate: [
    'A decent experience with minor caveats. ',
    'Generally acceptable performance. ',
    'Average service that meets basic needs. ',
    'Mixed experience with room for improvement. ',
    'Fair platform with balanced pros and cons. '
  ],
  risky: [
    'Disappointing experience with notable issues. ',
    'Encountered frustrating problems during use. ',
    'Significant concerns regarding reliability. ',
    'Caution advised based on repeated difficulties. ',
    'Unsatisfactory service quality encountered. '
  ]
};

function generateReviewComment(category, sentiment, seedIndex) {
  const catBank = SENTENCE_BANKS[category] || SENTENCE_BANKS['Other'];
  const pool = catBank[sentiment] || catBank['positive'] || SENTENCE_BANKS['Other']['positive'];
  const prefixes = SENTIMENT_PREFIXES[sentiment] || SENTIMENT_PREFIXES['positive'];

  const prefix = prefixes[seedIndex % prefixes.length];
  const s1 = pool[seedIndex % pool.length];
  const s2 = pool[(seedIndex + 3) % pool.length];

  if (s1 !== s2 && pool.length > 2) {
    return `${prefix}${s1} ${s2}`;
  }
  return `${prefix}${s1}`;
}

module.exports = {
  SENTENCE_BANKS,
  SENTIMENT_PREFIXES,
  generateReviewComment
};

