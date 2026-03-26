// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {
  sendNewRegistrationNotification,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('../utils/notificationService');

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { 
      id: userId,
      role: role 
    }, 
    process.env.JWT_SECRET || 'your-secret-key', 
    {
      expiresIn: '30d'
    }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    console.log('📝 Register request received:', req.body);
    
    const { name, email, password, phone, address } = req.body;

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user but set isVerified to false
    const user = await User.create({
      name,
      email,
      password,
      phone,
      address: address || {},
      isVerified: false,
      verificationCode: verificationCode
    });

    // Generate token with role (We'll still send it but frontend handles OTP flow before doing anything else)
    const token = generateToken(user._id, user.role);

    // 🚀 Send notifications in background (don't await)
    Promise.allSettled([
      // Notify admin about new registration (optional, might wait for verification)
      sendNewRegistrationNotification({
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt
      }),
      // Delay welcome email until they verify. Send validation email instead:
      sendVerificationEmail(user.email, verificationCode, user.name)
    ]).then(results => {
      console.log('📧 Registration notifications sent:', 
        results.map(r => r.status));
    }).catch(err => {
      console.error('❌ Some notifications failed:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token,
        requiresVerification: true
      }
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    console.log('🔐 Login request received for email:', req.body.email);
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isVerified && user.role !== 'admin' && user.role !== 'superadmin') {
      console.log('⚠️ Login blocked: Email not verified for', email);
      
      // Resend OTP so they can verify
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationCode = verificationCode;
      await user.save();
      
      Promise.allSettled([
        sendVerificationEmail(user.email, verificationCode, user.name)
      ]).catch(err => console.error(err));
      
      return res.status(403).json({
        success: false,
        message: 'Email not verified. A new verification code has been sent to your email.',
        requireVerification: true,
        email: user.email
      });
    }

    console.log('✅ User found:', user.email, 'Role:', user.role);

    // Check password using bcrypt directly for debugging
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔍 Password match (bcrypt):', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token with role
    const token = generateToken(user._id, user.role);

    console.log('✅ Login successful for:', user.email);

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and OTP'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    if (user.verificationCode !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationCode = null; // Clear the code
    await user.save();

    // Now send the welcome email!
    Promise.allSettled([
      sendWelcomeEmail({
        name: user.name,
        email: user.email,
        role: user.role
      })
    ]).catch(err => console.error(err));

    // Generate token if frontend needs it immediately
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email',
      error: error.message
    });
  }
};

// @desc    Forgot Password - Send Reset Link
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expiration to 30 mins
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Create reset url
    const clientUrl = process.env.CLIENT_URL || 'https://newpremglasshouse.in'; // fallback for dev
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // Send email
    try {
      const emailResult = await sendPasswordResetEmail(user.email, resetUrl, user.name);

      // In local development, it's helpful to log the reset URL directly
      if (process.env.NODE_ENV === 'development') {
        console.log('\n=============================================');
        console.log(`🔑 PASSWORD RESET LINK FOR ${user.email}:`);
        console.log(resetUrl);
        console.log('=============================================\n');
      }

      if (emailResult && !emailResult.success) {
        throw new Error(emailResult.error || 'Failed to send email');
      }

      res.status(200).json({
        success: true,
        message: 'Password reset link sent to your email'
      });
    } catch (err) {
      console.error('Email sending error:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, message: 'Email could not be sent. Please make sure email credentials are correct in backend/.env' });
    }
  } catch (error) {
    console.error('❌ Forgot Password error:', error);
    res.status(500).json({ success: false, message: 'Error processing request', error: error.message });
  }
};

// @desc    Reset Password via Link
// @route   POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with token and check if not expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    // Set new password (the pre-save middleware will hash it)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been successfully updated'
    });
  } catch (error) {
    console.error('❌ Reset Password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
  }
};

// Export all functions
module.exports = {
  registerUser,
  loginUser,
  getProfile,
  verifyEmail,
  forgotPassword,
  resetPassword
};