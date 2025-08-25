const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  // Ratings
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Review content
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Review title cannot exceed 200 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: [1000, 'Review comment cannot exceed 1000 characters']
  },
  
  // Media attachments
  images: {
    type: [String],
    validate: [arr => arr.length <= 5, 'Cannot have more than 5 images']
  },
  videos: {
    type: [String],
    validate: [arr => arr.length <= 2, 'Cannot have more than 2 videos']
  },
  
  // Review status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  
  // Moderation
  isVerified: {
    type: Boolean,
    default: false
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  rejectionReason: String,
  
  // Helpfulness
  helpfulVotes: {
    type: Number,
    default: 0
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  voters: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vote: {
      type: String,
      enum: ['helpful', 'not_helpful']
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Shop response
  shopResponse: {
    comment: {
      type: String,
      maxlength: [500, 'Shop response cannot exceed 500 characters']
    },
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile'],
      default: 'web'
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
reviewSchema.index({ product: 1, customer: 1 }, { unique: true, sparse: true });
reviewSchema.index({ shop: 1, customer: 1 });
reviewSchema.index({ customer: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ helpfulVotes: -1 });

// Virtual for helpfulness percentage
reviewSchema.virtual('helpfulnessPercentage').get(function() {
  if (this.totalVotes === 0) return 0;
  return Math.round((this.helpfulVotes / this.totalVotes) * 100);
});

// Ensure one review per product per customer
reviewSchema.pre('save', async function(next) {
  if (this.product && this.isNew) {
    const existingReview = await this.constructor.findOne({
      product: this.product,
      customer: this.customer
    });
    
    if (existingReview) {
      const error = new Error('You have already reviewed this product');
      error.statusCode = 400;
      return next(error);
    }
  }
  next();
});

// Update product rating after review save/update/delete
reviewSchema.post('save', async function() {
  await this.constructor.updateProductRating(this.product);
  if (this.shop) {
    await this.constructor.updateShopRating(this.shop);
  }
});

reviewSchema.post('remove', async function() {
  await this.constructor.updateProductRating(this.product);
  if (this.shop) {
    await this.constructor.updateShopRating(this.shop);
  }
});

// Static method to update product rating
reviewSchema.statics.updateProductRating = async function(productId) {
  if (!productId) return;
  
  const stats = await this.aggregate([
    { $match: { product: productId, status: 'approved' } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (stats.length > 0) {
    const { averageRating, totalReviews, ratingDistribution } = stats[0];
    
    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach(rating => {
      distribution[rating]++;
    });
    
    const Product = mongoose.model('Product');
    await Product.findByIdAndUpdate(productId, {
      'rating.average': Math.round(averageRating * 10) / 10,
      'rating.count': totalReviews,
      'rating.distribution': distribution
    });
  }
};

// Static method to update shop rating
reviewSchema.statics.updateShopRating = async function(shopId) {
  if (!shopId) return;
  
  const stats = await this.aggregate([
    { $match: { shop: shopId, status: 'approved' } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  
  if (stats.length > 0) {
    const { averageRating, totalReviews } = stats[0];
    
    const Shop = mongoose.model('Shop');
    await Shop.findByIdAndUpdate(shopId, {
      'stats.averageRating': Math.round(averageRating * 10) / 10,
      'stats.totalReviews': totalReviews
    });
  }
};

// Instance method to vote for helpfulness
reviewSchema.methods.voteHelpful = function(userId, isHelpful) {
  const existingVoteIndex = this.voters.findIndex(
    voter => voter.user.toString() === userId.toString()
  );
  
  if (existingVoteIndex > -1) {
    // Update existing vote
    const oldVote = this.voters[existingVoteIndex].vote;
    this.voters[existingVoteIndex].vote = isHelpful ? 'helpful' : 'not_helpful';
    this.voters[existingVoteIndex].votedAt = new Date();
    
    // Adjust vote counts
    if (oldVote === 'helpful' && !isHelpful) {
      this.helpfulVotes--;
    } else if (oldVote === 'not_helpful' && isHelpful) {
      this.helpfulVotes++;
    }
  } else {
    // Add new vote
    this.voters.push({
      user: userId,
      vote: isHelpful ? 'helpful' : 'not_helpful'
    });
    
    this.totalVotes++;
    if (isHelpful) {
      this.helpfulVotes++;
    }
  }
  
  return this.save();
};

module.exports = mongoose.model('Review', reviewSchema);