const mongoose = require('mongoose');

const evaluationParameterSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true
    },
    parameters: [
      {
        type: String,
        required: [true, 'Parameter name is required'],
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

// Index category for fast, case-insensitive lookups
evaluationParameterSchema.index({ category: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const EvaluationParameter = mongoose.model('EvaluationParameter', evaluationParameterSchema);
module.exports = EvaluationParameter;
