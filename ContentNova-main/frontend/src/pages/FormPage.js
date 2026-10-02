import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './FormPage.css';

const TONES = ['Fun', 'Professional', 'Casual', 'Bold'];
const PLATFORMS = ['Instagram', 'LinkedIn', 'Twitter', 'Facebook'];

const PLATFORM_ICONS = {
  Instagram: '📸',
  LinkedIn: '💼',
  Twitter: '🐦',
  Facebook: '👥',
};

const TONE_ICONS = {
  Fun: '🎉',
  Professional: '🎯',
  Casual: '😊',
  Bold: '⚡',
};

const TONE_COLORS = {
  Fun: '#f59e0b',
  Professional: '#6366f1',
  Casual: '#10b981',
  Bold: '#ef4444',
};

const PLATFORM_COLORS = {
  Instagram: '#e1306c',
  LinkedIn: '#0077b5',
  Twitter: '#1da1f2',
  Facebook: '#1877f2',
};

function FormPage({ onResults }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    brandName: '',
    description: '',
    targetAudience: '',
    tone: '',
    platform: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loadingStep, setLoadingStep] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const handleToneSelect = (tone) => {
    setFormData((prev) => ({ ...prev, tone }));
    if (fieldErrors.tone) {
      setFieldErrors((prev) => ({ ...prev, tone: '' }));
    }
    setServerError('');
  };

  const handlePlatformSelect = (platform) => {
    setFormData((prev) => ({ ...prev, platform }));
    if (fieldErrors.platform) {
      setFieldErrors((prev) => ({ ...prev, platform: '' }));
    }
    setServerError('');
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.brandName.trim()) {
      errors.brandName = 'Please enter your brand name';
    }
    if (!formData.description.trim()) {
      errors.description = 'Please enter what you sell or describe your business';
    }
    if (!formData.targetAudience.trim()) {
      errors.targetAudience = 'Please specify your target audience';
    }
    if (!formData.tone) {
      errors.tone = 'Please select a tone for your content';
    }
    if (!formData.platform) {
      errors.platform = 'Please select a social media platform';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Form Validation (Part 6)
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setServerError('Please fix the errors above before generating content.');
      return;
    }

    setFieldErrors({});
    setServerError('');
    setLoading(true);

    try {
      setLoadingStep('✍️ Crafting platform captions & hashtags with AI...');
      const response = await axios.post('/generate-content', formData);

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Failed to generate content. Please try again.');
      }

      setLoadingStep('🎨 Directing AI art & creating your custom poster...');
      const { captions, hashtags, imagePrompt, imageUrl, styleVariation } = response.data.data;

      setLoadingStep('✅ Finalizing your results...');

      const results = {
        captions,
        hashtags,
        imageUrl,
        imagePrompt,
        styleVariation: styleVariation || 'best fit for the brand and tone'
      };

      onResults(results, formData);
      setTimeout(() => navigate('/output'), 300);
    } catch (err) {
      console.error('Submission error:', err);
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Unable to connect to the content engine. Please check your connection and try again.';
      setServerError(msg);
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="form-page">
      {/* Background decorations */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <div className="form-container">
        {/* Header */}
        <div className="form-header">
          <div className="logo">
            <span className="logo-icon">✨</span>
            <span className="logo-text">ContentNova</span>
          </div>
          <h1 className="form-title">
            AI-Powered Content
            <span className="title-gradient"> Generator</span>
          </h1>
          <p className="form-subtitle">
            Transform your brand into tailored social media captions, hashtags & posters
          </p>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="loading-card">
              <div className="loading-spinner">
                <div className="spinner-ring" />
                <div className="spinner-ring spinner-ring-2" />
                <div className="spinner-core">✨</div>
              </div>
              <h3 className="loading-title">Generating Content...</h3>
              <p className="loading-step">{loadingStep}</p>
              <div className="loading-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="content-form" noValidate>
          {/* Brand Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="brandName">
              <span className="label-icon">🏷️</span>
              Brand / Product Name <span className="req-star">*</span>
            </label>
            <input
              id="brandName"
              type="text"
              name="brandName"
              value={formData.brandName}
              onChange={handleChange}
              className={`form-input ${fieldErrors.brandName ? 'input-error' : ''}`}
              placeholder="e.g., FitFuel Nutrition"
              disabled={loading}
            />
            {fieldErrors.brandName && (
              <span className="inline-field-error">⚠️ {fieldErrors.brandName}</span>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">
              <span className="label-icon">📝</span>
              What They Sell / Description <span className="req-star">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`form-input form-textarea ${fieldErrors.description ? 'input-error' : ''}`}
              placeholder="e.g., protein bars for gym workouts and recovery"
              rows={3}
              disabled={loading}
            />
            {fieldErrors.description && (
              <span className="inline-field-error">⚠️ {fieldErrors.description}</span>
            )}
          </div>

          {/* Target Audience */}
          <div className="form-group">
            <label className="form-label" htmlFor="targetAudience">
              <span className="label-icon">🎯</span>
              Target Audience <span className="req-star">*</span>
            </label>
            <input
              id="targetAudience"
              type="text"
              name="targetAudience"
              value={formData.targetAudience}
              onChange={handleChange}
              className={`form-input ${fieldErrors.targetAudience ? 'input-error' : ''}`}
              placeholder="e.g., fitness enthusiasts and athletes"
              disabled={loading}
            />
            {fieldErrors.targetAudience && (
              <span className="inline-field-error">⚠️ {fieldErrors.targetAudience}</span>
            )}
          </div>

          {/* Tone Selection */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🎭</span>
              Content Tone <span className="req-star">*</span>
            </label>
            <div className="option-grid">
              {TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  className={`option-btn ${formData.tone === tone ? 'option-selected' : ''} ${fieldErrors.tone ? 'option-btn-error' : ''}`}
                  style={{
                    '--option-color': TONE_COLORS[tone],
                  }}
                  onClick={() => handleToneSelect(tone)}
                  disabled={loading}
                >
                  <span className="option-icon">{TONE_ICONS[tone]}</span>
                  <span className="option-label">{tone}</span>
                  {formData.tone === tone && <span className="option-check">✓</span>}
                </button>
              ))}
            </div>
            {fieldErrors.tone && (
              <span className="inline-field-error">⚠️ {fieldErrors.tone}</span>
            )}
          </div>

          {/* Platform Selection */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📱</span>
              Platform <span className="req-star">*</span>
            </label>
            <div className="option-grid">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  className={`option-btn platform-btn ${formData.platform === platform ? 'option-selected' : ''} ${fieldErrors.platform ? 'option-btn-error' : ''}`}
                  style={{
                    '--option-color': PLATFORM_COLORS[platform],
                  }}
                  onClick={() => handlePlatformSelect(platform)}
                  disabled={loading}
                >
                  <span className="option-icon">{PLATFORM_ICONS[platform]}</span>
                  <span className="option-label">{platform}</span>
                  {formData.platform === platform && <span className="option-check">✓</span>}
                </button>
              ))}
            </div>
            {fieldErrors.platform && (
              <span className="inline-field-error">⚠️ {fieldErrors.platform}</span>
            )}
          </div>

          {/* Server Error with Try Again button (Part 6) */}
          {serverError && (
            <div className="error-banner">
              <div className="error-content">
                <span className="error-icon">⚠️</span>
                <span>{serverError}</span>
              </div>
              <button
                type="button"
                className="retry-btn"
                onClick={() => handleSubmit()}
              >
                🔄 Try again
              </button>
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner" />
                Generating...
              </>
            ) : (
              <>
                <span>✨</span>
                Generate Content & Poster
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FormPage;
