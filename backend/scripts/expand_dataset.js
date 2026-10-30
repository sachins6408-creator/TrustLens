const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Website = require('../models/Website');
const Review = require('../models/Review');
const User = require('../models/User');
const EvaluationParameter = require('../models/EvaluationParameter');
const { recalculateWebsiteRatings } = require('../controllers/reviewController');
const { DEFAULT_CATEGORY_PARAMETERS } = require('../controllers/evaluationParameterController');
const additionalWebsites = require('../data/additional_websites');
const syntheticUsers = require('../data/synthetic_users');
const { generateReviewComment } = require('../data/comment_generator');

// Helper to determine deterministic website trust profile
// Returns: 'high_trust' (68%), 'moderate_trust' (22%), 'risky' (10%)
function getWebsiteTrustProfile(domain, category) {
  // Known risky / troubled entities for benchmark diversity
  const lowerDomain = domain.toLowerCase();
  if (
    lowerDomain.includes('globalvirtualcollege') ||
    lowerDomain.includes('swiggy-1788026499486') ||
    lowerDomain.includes('medlife') ||
    lowerDomain.includes('shein') ||
    lowerDomain.includes('wish.com')
  ) {
    return 'risky';
  }

  // Known top-tier trusted entities
  if (
    category === 'Government Services' ||
    category === 'College and University Websites' ||
    lowerDomain.includes('iit') ||
    lowerDomain.includes('gov') ||
    lowerDomain.includes('mit.edu') ||
    lowerDomain.includes('stanford') ||
    lowerDomain.includes('ox.ac.uk') ||
    lowerDomain.includes('harvard') ||
    lowerDomain.includes('rbi.org') ||
    lowerDomain.includes('aiims')
  ) {
    // Government and premier institutions are overwhelmingly High Trust
    let hash = 0;
    for (let i = 0; i < domain.length; i++) hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
    return (hash % 10 < 9) ? 'high_trust' : 'moderate_trust';
  }

  // General hash distribution
  let hash = 0;
  for (let i = 0; i < domain.length; i++) hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  const mod = hash % 100;
  if (mod < 68) return 'high_trust';
  if (mod < 90) return 'moderate_trust';
  return 'risky';
}

async function expandDataset() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trustlens';
  console.log('====================================================');
  console.log('[TrustLens Dataset Expansion]: Connecting to MongoDB');
  console.log('URI:', uri);
  console.log('====================================================');
  await mongoose.connect(uri);

  const initialWebsitesCount = await Website.countDocuments();
  const initialReviewsCount = await Review.countDocuments();
  const initialUsersCount = await User.countDocuments();
  console.log(`Initial Status -> Websites: ${initialWebsitesCount}, Reviews: ${initialReviewsCount}, Users: ${initialUsersCount}`);

  // ====================================================
  // STEP 1: Ensure Category Evaluation Parameters
  // ====================================================
  console.log('\n[Step 1/5]: Verifying & seeding category evaluation parameters...');
  for (const [category, parameters] of Object.entries(DEFAULT_CATEGORY_PARAMETERS)) {
    const escaped = category.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    let record = await EvaluationParameter.findOne({ category: new RegExp(`^${escaped}$`, 'i') });
    if (!record) {
      await EvaluationParameter.create({ category, parameters });
      console.log(`  + Created evaluation parameters for: "${category}" (${parameters.length} parameters)`);
    } else {
      record.parameters = parameters;
      await record.save();
    }
  }
  const totalParams = await EvaluationParameter.countDocuments();
  console.log(`✓ All category parameters active. Total categories configured: ${totalParams}`);

  // ====================================================
  // STEP 2: Ensure User Pool
  // ====================================================
  console.log('\n[Step 2/5]: Ensuring user pool for diverse reviews...');
  const salt = await bcrypt.genSalt(10);
  const defaultHashedPassword = await bcrypt.hash('password123', salt);
  let newUsersCount = 0;

  for (const u of syntheticUsers) {
    const existing = await User.findOne({ email: u.email.toLowerCase().trim() });
    if (!existing) {
      await User.collection.insertOne({
        name: u.name,
        email: u.email.toLowerCase().trim(),
        password: defaultHashedPassword,
        role: 'user',
        status: 'active',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 180 * 86400000)),
        updatedAt: new Date()
      });
      newUsersCount++;
    }
  }
  const allUsers = await User.find({ role: 'user', status: 'active' }).select('_id name email');
  console.log(`✓ User pool ready. Added ${newUsersCount} new users. Total active reviewers available: ${allUsers.length}`);

  // ====================================================
  // STEP 3: Insert Additional Websites
  // ====================================================
  console.log('\n[Step 3/5]: Seeding additional unique websites...');
  let newWebsitesAdded = 0;
  let websitesSkipped = 0;

  for (const site of additionalWebsites) {
    const domainLower = site.domain.toLowerCase().trim();
    const existing = await Website.findOne({ domain: domainLower });
    if (existing) {
      websitesSkipped++;
    } else {
      await Website.create({
        name: site.name.trim(),
        domain: domainLower,
        url: site.url.trim(),
        category: site.category.trim(),
        description: site.description.trim(),
        status: 'active',
        trustScore: 0,
        trustCategory: 'Not Rated Yet',
        totalReviews: 0,
        parameterRatings: {},
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 200 * 86400000)),
        updatedAt: new Date()
      });
      newWebsitesAdded++;
    }
  }
  const totalWebsitesNow = await Website.countDocuments();
  console.log(`✓ Websites expansion complete. Added: ${newWebsitesAdded}, Skipped (already existed): ${websitesSkipped}. Total Websites in DB: ${totalWebsitesNow}`);

  // ====================================================
  // STEP 4: Review Dataset Expansion (Target >= 12,000)
  // ====================================================
  console.log('\n[Step 4/5]: Generating reviews to reach >= 12,000 reviews...');
  const allActiveWebsites = await Website.find({ status: { $in: ['active', 'Active'] } });
  let totalNewReviewsInserted = 0;
  const reviewBatch = [];

  for (let siteIndex = 0; siteIndex < allActiveWebsites.length; siteIndex++) {
    const site = allActiveWebsites[siteIndex];
    const categoryParams = DEFAULT_CATEGORY_PARAMETERS[site.category] || DEFAULT_CATEGORY_PARAMETERS['Other'];
    const trustProfile = getWebsiteTrustProfile(site.domain, site.category);

    // Check existing reviews for this website
    const existingReviews = await Review.find({ website: site._id }).select('user');
    const existingUserIds = new Set(existingReviews.map((r) => r.user.toString()));

    // Target between 18 and 22 reviews for each active website
    // Determine target based on domain hash
    let hash = 0;
    for (let i = 0; i < site.domain.length; i++) hash = (hash * 31 + site.domain.charCodeAt(i)) >>> 0;
    const targetReviewsCount = 18 + (hash % 5); // 18, 19, 20, 21, or 22 reviews

    const neededReviews = targetReviewsCount - existingUserIds.size;
    if (neededReviews <= 0) {
      continue;
    }

    // Filter candidate users who have not yet reviewed this website
    const candidateUsers = allUsers.filter((u) => !existingUserIds.has(u._id.toString()));
    
    // Shuffle candidate users deterministically
    const shuffled = [...candidateUsers].sort((a, b) => {
      const hA = ((hash ^ a._id.toString().charCodeAt(10)) * 17) % 100;
      const hB = ((hash ^ b._id.toString().charCodeAt(10)) * 17) % 100;
      return hA - hB;
    });

    const selectedUsers = shuffled.slice(0, neededReviews);

    for (let uIdx = 0; uIdx < selectedUsers.length; uIdx++) {
      const user = selectedUsers[uIdx];
      const reviewIndex = existingUserIds.size + uIdx;
      existingUserIds.add(user._id.toString());

      // Generate ratings based on trust profile
      const ratings = {};
      let ratingSum = 0;

      let sentiment = 'positive';
      if (trustProfile === 'high_trust') {
        sentiment = (reviewIndex % 8 === 0) ? 'moderate' : 'positive';
      } else if (trustProfile === 'moderate_trust') {
        sentiment = (reviewIndex % 3 === 0) ? 'positive' : ((reviewIndex % 5 === 0) ? 'risky' : 'moderate');
      } else {
        // risky profile
        sentiment = (reviewIndex % 6 === 0) ? 'moderate' : 'risky';
      }

      categoryParams.forEach((param, pIdx) => {
        let score;
        const seed = (hash + reviewIndex * 7 + pIdx * 13) % 100;

        if (sentiment === 'positive') {
          // Mostly 4 and 5
          score = seed < 65 ? 5 : (seed < 92 ? 4 : 3);
        } else if (sentiment === 'moderate') {
          // Mostly 3 and 4, some 2
          score = seed < 45 ? 3 : (seed < 75 ? 4 : (seed < 90 ? 2 : 5));
        } else {
          // Mostly 1 and 2, rare 3
          score = seed < 50 ? 2 : (seed < 85 ? 1 : 3);
        }

        ratings[param] = score;
        ratingSum += score;
      });

      const overallRating = Number((ratingSum / categoryParams.length).toFixed(1));
      const comment = generateReviewComment(site.category, sentiment, siteIndex + reviewIndex * 3 + uIdx);

      // Moderation status: 97% approved, 1.5% flagged, 0.75% rejected, 0.75% pending
      const statusMod = (hash + reviewIndex * 19 + uIdx * 11) % 400;
      let status = 'approved';
      let moderationNote = '[Synthetic Demonstration Data] Verified TrustLens Evaluation Benchmark Record';

      if (statusMod < 6) {
        status = 'flagged';
        moderationNote = '[Synthetic Demonstration Data] Flagged for dispute check review';
      } else if (statusMod < 9) {
        status = 'rejected';
        moderationNote = '[Synthetic Demonstration Data] Rejected during quality moderation audit';
      } else if (statusMod < 12) {
        status = 'pending';
        moderationNote = '[Synthetic Demonstration Data] Pending manual community review';
      }

      // Random date between 14 days and 365 days ago
      const daysAgo = 14 + ((hash + reviewIndex * 17) % 350);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);

      reviewBatch.push({
        user: user._id,
        website: site._id,
        ratings,
        overallRating,
        comment,
        status,
        moderationNote,
        moderatedBy: null,
        moderatedAt: status !== 'pending' ? createdAt : null,
        createdAt,
        updatedAt: createdAt
      });

      if (reviewBatch.length >= 1000) {
        await Review.collection.insertMany(reviewBatch, { ordered: false });
        totalNewReviewsInserted += reviewBatch.length;
        console.log(`  ... inserted ${totalNewReviewsInserted} reviews so far`);
        reviewBatch.length = 0;
      }
    }
  }

  if (reviewBatch.length > 0) {
    await Review.collection.insertMany(reviewBatch, { ordered: false });
    totalNewReviewsInserted += reviewBatch.length;
  }

  const totalReviewsNow = await Review.countDocuments();
  console.log(`✓ Review expansion complete. Inserted: ${totalNewReviewsInserted} new reviews. Total Reviews in DB: ${totalReviewsNow}`);

  // ====================================================
  // STEP 5: Recalculate Trust Scores for ALL Websites
  // ====================================================
  console.log('\n[Step 5/5]: Recalculating Trust Scores for all websites using production logic...');
  const allWebsites = await Website.find();
  let recalcCount = 0;

  for (const site of allWebsites) {
    await recalculateWebsiteRatings(site._id);
    recalcCount++;
    if (recalcCount % 100 === 0 || recalcCount === allWebsites.length) {
      console.log(`  ... recalculated ${recalcCount}/${allWebsites.length} websites`);
    }
  }
  console.log('✓ All website ratings and trust scores recalculated successfully.');

  // ====================================================
  // FINAL SUMMARY VERIFICATION
  // ====================================================
  console.log('\n====================================================');
  console.log('          FINAL VERIFICATION REPORT');
  console.log('====================================================');

  const finalWebsites = await Website.countDocuments();
  const finalReviews = await Review.countDocuments();
  const finalUsers = await User.countDocuments();
  const finalParamsCount = await EvaluationParameter.countDocuments();

  console.log(`Total Websites in DB:      ${finalWebsites} (Requirement: >= 650) -> ${finalWebsites >= 650 ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`Total Reviews in DB:       ${finalReviews} (Requirement: >= 12,000) -> ${finalReviews >= 12000 ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`Total Users in DB:         ${finalUsers}`);
  console.log(`Total Categories in DB:    ${finalParamsCount}`);

  // Category breakdown
  const categoryStats = await Website.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('\nWebsites by Category:');
  console.table(categoryStats);

  // Trust score distribution
  const trustStats = await Website.aggregate([
    { $group: { _id: '$trustCategory', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Trust Category Distribution:');
  console.table(trustStats);

  // Review status distribution
  const reviewStatusStats = await Review.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Review Status Distribution:');
  console.table(reviewStatusStats);

  console.log('====================================================');
  console.log('Dataset expansion completed successfully!');
  console.log('====================================================');
  process.exit(0);
}

expandDataset().catch((err) => {
  console.error('[Dataset Expansion Error]:', err);
  process.exit(1);
});

