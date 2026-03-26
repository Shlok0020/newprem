// frontend/src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaArrowRight, FaEye, FaEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirectProduct, setRedirectProduct] = useState(null);
  
  // Verification step
  const [verifyStep, setVerifyStep] = useState(false);
  const [otp, setOtp] = useState('');

  // Forgot password states
  const [forgotPasswordStep, setForgotPasswordStep] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    if (location.state?.product) {
      setRedirectProduct(location.state.product);
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (verifyStep) return handleVerify(e);
    
    setLoading(true);

    try {
      console.log('Logging in with:', formData.email);
      
      const response = await authAPI.login(formData);
      
      let userData;
      let token;
      
      // ✅ FIXED: Proper token extraction
      if (response.data?.token) {
        token = response.data.token;
        userData = response.data.user || response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
      } else if (response.token) {
        token = response.token;
        userData = response.user || response;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        throw new Error('No token received from server');
      }
      
      console.log('User role:', userData?.role);
      
      toast.success(`Welcome back, ${userData?.name || 'User'}!`);
      
      setLoading(false);
      
      // ✅ FIXED: Redirect with delay
      setTimeout(() => {
        if (
          userData?.role === 'admin' ||
          userData?.role === 'superadmin' ||
          userData?.role === 'Super Admin'
        ){
          console.log('👑 Admin login - secure redirecting to admin panel');
          
          // Send token via secure cookie AND URL parameters to guarantee transfer across ports
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const domainString = isLocalhost ? '' : 'domain=.localhost:5173; ';
          
          document.cookie = `admin_auth_token=${token}; ${domainString}path=/; max-age=60; secure; samesite=Lax`;
          document.cookie = `admin_auth_user=${encodeURIComponent(JSON.stringify(userData))}; ${domainString}path=/; max-age=60; secure; samesite=Lax`;
          
          window.location.href = `http://localhost:5174/?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}#/dashboard`;
        } else {
          console.log('👤 User login - redirecting to homepage');
          
          if (redirectProduct) {
            sessionStorage.setItem('redirectProduct', JSON.stringify(redirectProduct));
            window.location.href = '/order';
          } else {
            window.location.href = '/';
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('Login error:', error);
      if (error.requireVerification || error.requiresVerification) {
        setVerifyStep(true);
      } else {
        toast.error(error.message || 'Login failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error('Please enter the OTP');
    setLoading(true);
    try {
      const response = await authAPI.verify({ email: formData.email, otp });
      toast.success(response.message || 'Email verified successfully!');
      
      // Navigate or login immediately
      const token = response.data?.token || response.token;
      const userData = response.data?.user || response.data || response.user;
      
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
      }
      
      setTimeout(() => {
        if (
          userData?.role === 'admin' ||
          userData?.role === 'superadmin' ||
          userData?.role === 'Super Admin'
        ) {
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const domainString = isLocalhost ? '' : 'domain=.localhost:5173; ';
          document.cookie = `admin_auth_token=${token}; ${domainString}path=/; max-age=60; secure; samesite=Lax`;
          document.cookie = `admin_auth_user=${encodeURIComponent(JSON.stringify(userData))}; ${domainString}path=/; max-age=60; secure; samesite=Lax`;
          window.location.href = `http://localhost:5174/?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}#/dashboard`;
        } else {
          if (redirectProduct) {
            sessionStorage.setItem('redirectProduct', JSON.stringify(redirectProduct));
            window.location.href = '/order';
          } else {
            window.location.href = '/';
          }
        }
      }, 1000);
      
    } catch (error) {
      toast.error(error.message || 'Verification failed. Please try again.');
      setLoading(false);
    }
  };

  // Forgot password handlers
  const handleForgotPassword = () => {
    setForgotPasswordStep(true);
  };

  const handleBackToLogin = () => {
    setForgotPasswordStep(false);
    setResetEmail('');
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }
    
    setLoading(true);
    try {
      const response = await authAPI.forgotPassword({ email: resetEmail });
      toast.success(response.message || 'Password reset link sent to your email!');
      handleBackToLogin();
    } catch (error) {
      toast.error(error.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="auth-page"
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
    >
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{forgotPasswordStep ? 'Reset Password' : 'Welcome Back'}</h1>
            <p>
              {forgotPasswordStep 
                  ? 'Enter your email to receive a password reset link' 
                : 'Login to your account to continue'
              }
            </p>
          </div>

          {forgotPasswordStep ? (
            <form onSubmit={handleRequestReset} className="auth-form">
                <div className="form-group">
                  <label>
                    <FaEnvelope /> Email
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    disabled={loading}
                  />
                </div>

              <motion.button
                type="submit"
                className="auth-submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Sending Link...' : 'Send Reset Link'} <FaArrowRight />
              </motion.button>

              <div className="auth-footer">
                <p>
                  <button 
                    type="button"
                    onClick={handleBackToLogin}
                    className="back-to-login-btn"
                    disabled={loading}
                  >
                    Back to Login
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="auth-form">
                {verifyStep ? (
                  <div className="form-group">
                    <label>
                      <FaEnvelope /> Verification Code (OTP)
                    </label>
                    <input
                      type="text"
                      name="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP sent to your email"
                      required
                      disabled={loading}
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>
                        <FaEnvelope /> Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <FaLock /> Password
                      </label>
                      <div className="password-input">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Enter your password"
                          required
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {!verifyStep && (
                  <div className="forgot-password-link">
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="forgot-password-btn"
                      disabled={loading}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                <motion.button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (verifyStep ? 'Verifying...' : 'Logging in...') : (verifyStep ? 'Verify OTP' : 'Login')} <FaArrowRight />
                </motion.button>
              </form>

              <div className="auth-footer">
                <p>Don't have an account? <Link to="/register">Register here</Link></p>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, #f8f5f0 0%, #f2ede4 100%);
        }
        :global(.navbar), 
        :global(header), 
        :global(nav) {
          display: none !important;
        }
        .auth-container {
          width: 100%;
          max-width: 450px;
        }
        .auth-card {
          background: white;
          border-radius: 30px;
          padding: 3rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .auth-header h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.5rem;
          color: #333;
          margin-bottom: 0.5rem;
        }
        .auth-header p {
          color: #666;
          font-size: 0.95rem;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #555;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .form-group label svg {
          color: #c9a96e;
        }
        .form-group input {
          padding: 1rem;
          border: 2px solid #eee;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s;
        }
        .form-group input:focus {
          outline: none;
          border-color: #c9a96e;
        }
        .form-group input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }
        .password-input {
          position: relative;
        }
        .password-input input {
          width: 100%;
          padding-right: 50px;
        }
        .password-toggle {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 1.2rem;
        }
        .password-toggle:hover:not(:disabled) {
          color: #c9a96e;
        }
        .password-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        .forgot-password-link {
          text-align: right;
          margin-top: -0.5rem;
        }
        .forgot-password-btn {
          background: none;
          border: none;
          color: #c9a96e;
          font-size: 0.85rem;
          cursor: pointer;
          transition: color 0.3s;
        }
        .forgot-password-btn:hover:not(:disabled) {
          color: #b38b4a;
        }
        .forgot-password-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .back-to-login-btn {
          background: none;
          border: none;
          color: #c9a96e;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          transition: color 0.3s;
        }
        .back-to-login-btn:hover:not(:disabled) {
          color: #b38b4a;
        }
        .back-to-login-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .auth-submit {
          background: #c9a96e;
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 1rem;
        }
        .auth-submit:hover:not(:disabled) {
          background: #b38b4a;
        }
        .auth-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .auth-footer {
          text-align: center;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #eee;
        }
        .auth-footer a {
          color: #c9a96e;
          text-decoration: none;
          font-weight: 600;
        }
        .auth-footer a:hover {
          text-decoration: underline;
        }
        @media (max-width: 480px) {
          .auth-card {
            padding: 2rem;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default Login;