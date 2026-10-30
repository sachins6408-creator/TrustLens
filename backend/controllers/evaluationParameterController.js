const EvaluationParameter = require('../models/EvaluationParameter');

// Standard default evaluation parameters map based on requirements
const DEFAULT_CATEGORY_PARAMETERS = {
  'E-Commerce': [
    'Product Quality',
    'Delivery Experience',
    'Payment Security',
    'Refund & Return Process',
    'Pricing Transparency',
    'Customer Support',
    'Product Information Accuracy'
  ],
  'Travel & Booking': [
    'Booking Experience',
    'Price Transparency',
    'Cancellation Policy',
    'Service Quality',
    'Accommodation/Travel Experience',
    'Customer Support',
    'Payment Reliability'
  ],
  'Financial Services': [
    'Security',
    'Privacy Protection',
    'Transaction Reliability',
    'Fraud Protection',
    'Service Availability',
    'Customer Support',
    'User Experience'
  ],
  'Entertainment': [
    'Content Quality',
    'Streaming/Service Performance',
    'User Experience',
    'Subscription Management',
    'Content Variety',
    'Application Stability',
    'Customer Support'
  ],
  'Education': [
    'Course Quality',
    'Learning Materials',
    'Instructor Quality',
    'Certification Value',
    'Platform Usability',
    'Student Support',
    'Pricing'
  ],
  'Healthcare': [
    'Service Quality',
    'Data Privacy',
    'Appointment Experience',
    'Professional Reliability',
    'Information Accuracy',
    'Customer Support',
    'Accessibility'
  ],
  'Technology': [
    'Product/Service Reliability',
    'Performance',
    'Security',
    'Compatibility',
    'Innovation',
    'User Experience',
    'Technical Support'
  ],
  'Food & Dining': [
    'Food Quality',
    'Delivery Experience',
    'Order Accuracy',
    'Pricing',
    'Hygiene Standards',
    'Customer Service',
    'App/Website Experience'
  ],
  'Social Media': [
    'Privacy Protection',
    'Security',
    'Content Quality',
    'User Experience',
    'Community Management',
    'Account Control',
    'Platform Reliability'
  ],
  'Government Services': [
    'Portal Accessibility & Uptime',
    'Information Transparency',
    'Application & Processing Speed',
    'Data Privacy & Security',
    'User Interface & Ease of Use',
    'Grievance Redressal & Support',
    'Document Verification Reliability'
  ],
  'News and Media': [
    'Reporting Accuracy & Fact-Checking',
    'Source Transparency',
    'Editorial Independence',
    'Content Depth & Quality',
    'Ad & Subscription Experience',
    'Correction & Retraction Policy',
    'Website Performance & Readability'
  ],
  'College and University Websites': [
    'Academic & Curriculum Quality',
    'Faculty & Research Output',
    'Campus & Infrastructure Quality',
    'Placement & Career Opportunities',
    'Student Portal & LMS Usability',
    'Admission & Fee Transparency',
    'Student Support Services'
  ],
  'Other': [
    'Reliability',
    'User Experience',
    'Service Quality',
    'Security',
    'Customer Support',
    'Transparency',
    'Overall Satisfaction'
  ]
};

// Aliases mapping for user convenience
const CATEGORY_ALIASES = {
  'travel / booking': 'Travel & Booking',
  'travel and booking': 'Travel & Booking',
  'travel': 'Travel & Booking',
  'booking': 'Travel & Booking',
  'banking / finance': 'Financial Services',
  'banking and finance': 'Financial Services',
  'banking': 'Financial Services',
  'finance': 'Financial Services',
  'food / dining': 'Food & Dining',
  'food & beverage': 'Food & Dining',
  'food delivery': 'Food & Dining',
  'food and dining': 'Food & Dining',
  'ecommerce': 'E-Commerce',
  'e-commerce': 'E-Commerce',
  'shopping': 'E-Commerce',
  'college': 'College and University Websites',
  'colleges': 'College and University Websites',
  'university': 'College and University Websites',
  'universities': 'College and University Websites',
  'higher education': 'College and University Websites',
  'college / university': 'College and University Websites',
  'colleges / universities': 'College and University Websites',
  'college and university websites': 'College and University Websites',
  'school': 'Education',
  'schools': 'Education',
  'academia': 'College and University Websites',
  'government': 'Government Services',
  'government services': 'Government Services',
  'gov': 'Government Services',
  'news': 'News and Media',
  'news & media': 'News and Media',
  'news and media': 'News and Media',
  'media': 'News and Media'
};

const normalizeCategory = (cat) => {
  if (!cat) return '';
  return cat.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

const findDefaultParametersForCategory = (categoryName) => {
  if (!categoryName) return { category: 'Other', parameters: DEFAULT_CATEGORY_PARAMETERS['Other'] };

  const rawLower = categoryName.trim().toLowerCase();
  if (CATEGORY_ALIASES[rawLower]) {
    const canonical = CATEGORY_ALIASES[rawLower];
    return { category: canonical, parameters: DEFAULT_CATEGORY_PARAMETERS[canonical] };
  }

  const norm = normalizeCategory(categoryName);
  for (const [key, params] of Object.entries(DEFAULT_CATEGORY_PARAMETERS)) {
    const keyNorm = normalizeCategory(key);
    if (norm === keyNorm) {
      return { category: key, parameters: params };
    }
  }

  // Substring / fuzzy checks
  if (norm.includes('govern') || norm.includes('publicservice')) {
    return { category: 'Government Services', parameters: DEFAULT_CATEGORY_PARAMETERS['Government Services'] };
  }
  if (norm.includes('news') || norm.includes('journal') || norm.includes('press')) {
    return { category: 'News and Media', parameters: DEFAULT_CATEGORY_PARAMETERS['News and Media'] };
  }
  if (norm.includes('college') || norm.includes('univ')) {
    return { category: 'College and University Websites', parameters: DEFAULT_CATEGORY_PARAMETERS['College and University Websites'] };
  }
  if (norm.includes('bank') || norm.includes('financ')) {
    return { category: 'Financial Services', parameters: DEFAULT_CATEGORY_PARAMETERS['Financial Services'] };
  }
  if (norm.includes('travel') || norm.includes('book')) {
    return { category: 'Travel & Booking', parameters: DEFAULT_CATEGORY_PARAMETERS['Travel & Booking'] };
  }
  if (norm.includes('food') || norm.includes('dine') || norm.includes('dining') || norm.includes('restaur')) {
    return { category: 'Food & Dining', parameters: DEFAULT_CATEGORY_PARAMETERS['Food & Dining'] };
  }
  if (norm.includes('ecom') || norm.includes('shop') || norm.includes('retail')) {
    return { category: 'E-Commerce', parameters: DEFAULT_CATEGORY_PARAMETERS['E-Commerce'] };
  }
  if (norm.includes('social')) {
    return { category: 'Social Media', parameters: DEFAULT_CATEGORY_PARAMETERS['Social Media'] };
  }
  if (norm.includes('health') || norm.includes('medic') || norm.includes('doctor')) {
    return { category: 'Healthcare', parameters: DEFAULT_CATEGORY_PARAMETERS['Healthcare'] };
  }
  if (norm.includes('edu') || norm.includes('learn') || norm.includes('course') || norm.includes('school')) {
    return { category: 'Education', parameters: DEFAULT_CATEGORY_PARAMETERS['Education'] };
  }
  if (norm.includes('tech') || norm.includes('software') || norm.includes('saas') || norm.includes('cloud')) {
    return { category: 'Technology', parameters: DEFAULT_CATEGORY_PARAMETERS['Technology'] };
  }
  if (norm.includes('entertain') || norm.includes('movie') || norm.includes('stream') || norm.includes('music')) {
    return { category: 'Entertainment', parameters: DEFAULT_CATEGORY_PARAMETERS['Entertainment'] };
  }

  return { category: categoryName, parameters: DEFAULT_CATEGORY_PARAMETERS['Other'] };
};

// @desc    Get dynamic evaluation parameters for a specific category
// @route   GET /api/evaluation-parameters/:category
// @access  Public
const getParametersByCategory = async (req, res, next) => {
  try {
    const rawCategory = req.params.category || req.params[0] || req.query.category;
    if (!rawCategory || !String(rawCategory).trim()) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const decodedCategory = decodeURIComponent(String(rawCategory)).trim();

    // 1. Search in Database (case-insensitive)
    const escaped = decodedCategory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    let record = await EvaluationParameter.findOne({
      category: new RegExp(`^${escaped}$`, 'i')
    });

    if (record && record.parameters && record.parameters.length > 0) {
      return res.status(200).json({
        success: true,
        category: record.category,
        parameters: record.parameters
      });
    }

    // Check alias in DB
    const fallback = findDefaultParametersForCategory(decodedCategory);
    if (fallback.category !== decodedCategory) {
      const canonicalEscaped = fallback.category.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      record = await EvaluationParameter.findOne({
        category: new RegExp(`^${canonicalEscaped}$`, 'i')
      });
      if (record && record.parameters && record.parameters.length > 0) {
        return res.status(200).json({
          success: true,
          category: record.category,
          parameters: record.parameters
        });
      }
    }

    // 2. Fallback to exact predefined category mapping
    return res.status(200).json({
      success: true,
      category: decodedCategory,
      parameters: fallback.parameters
    });
  } catch (error) {
    console.error('[Get Evaluation Parameters Error]:', error.message);
    next(error);
  }
};

// @desc    Get all evaluation parameter configurations
// @route   GET /api/evaluation-parameters
// @access  Public
const getAllEvaluationParameters = async (req, res, next) => {
  try {
    const records = await EvaluationParameter.find().sort({ category: 1 });
    return res.status(200).json({
      success: true,
      count: records.length,
      evaluationParameters: records
    });
  } catch (error) {
    console.error('[Get All Evaluation Parameters Error]:', error.message);
    next(error);
  }
};

// @desc    Create or update evaluation parameters for a category
// @route   POST /api/evaluation-parameters
// @access  Private/Admin
const createOrUpdateParameters = async (req, res, next) => {
  try {
    const { category, parameters } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one evaluation parameter is required'
      });
    }

    const cleanedParams = Array.from(
      new Set(
        parameters
          .map((p) => (typeof p === 'string' ? p.trim() : ''))
          .filter((p) => p.length > 0)
      )
    );

    if (cleanedParams.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid parameter names are required'
      });
    }

    const trimmedCategory = category.trim();

    const escaped = trimmedCategory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    let record = await EvaluationParameter.findOne({
      category: new RegExp(`^${escaped}$`, 'i')
    });

    if (record) {
      record.category = trimmedCategory;
      record.parameters = cleanedParams;
      await record.save();
    } else {
      record = await EvaluationParameter.create({
        category: trimmedCategory,
        parameters: cleanedParams
      });
    }

    return res.status(200).json({
      success: true,
      message: `Evaluation parameters for "${trimmedCategory}" saved successfully`,
      evaluationParameter: record
    });
  } catch (error) {
    console.error('[Create/Update Parameters Error]:', error.message);
    next(error);
  }
};

// @desc    Update evaluation parameters by ID
// @route   PUT /api/evaluation-parameters/:id
// @access  Private/Admin
const updateParametersById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, parameters } = req.body;

    const record = await EvaluationParameter.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Evaluation parameter config not found' });
    }

    if (category && category.trim()) {
      record.category = category.trim();
    }

    if (parameters && Array.isArray(parameters)) {
      const cleaned = Array.from(
        new Set(
          parameters
            .map((p) => (typeof p === 'string' ? p.trim() : ''))
            .filter((p) => p.length > 0)
        )
      );
      if (cleaned.length > 0) {
        record.parameters = cleaned;
      }
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: `Evaluation parameters for "${record.category}" updated successfully`,
      evaluationParameter: record
    });
  } catch (error) {
    console.error('[Update Parameters By ID Error]:', error.message);
    next(error);
  }
};

// @desc    Delete evaluation parameters for a category by ID
// @route   DELETE /api/evaluation-parameters/:id
// @access  Private/Admin
const deleteParameters = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await EvaluationParameter.findById(id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Evaluation parameter config not found' });
    }

    await EvaluationParameter.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Evaluation parameter configuration for "${record.category}" deleted successfully`
    });
  } catch (error) {
    console.error('[Delete Parameters Error]:', error.message);
    next(error);
  }
};

module.exports = {
  DEFAULT_CATEGORY_PARAMETERS,
  CATEGORY_ALIASES,
  findDefaultParametersForCategory,
  getParametersByCategory,
  getAllEvaluationParameters,
  createOrUpdateParameters,
  updateParametersById,
  deleteParameters
};
