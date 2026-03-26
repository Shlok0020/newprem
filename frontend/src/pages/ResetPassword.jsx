// frontend/src/pages/ResetPassword.jsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaLock, FaArrowRight, FaEye, FaEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const response = await authAPI.resetPassword(token, { newPassword });
      toast.success(response.message || 'Password reset successfully! Please login with your new password.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Failed to reset password. The link might be expired or invalid.');
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
            <h1>Create New Password</h1>
            <p>Please enter your new password below to reset your account access.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>
                <FaLock /> New Password
              </label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)"
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

            <div className="form-group">
              <label>
                <FaLock /> Confirm Password
              </label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <motion.button
              type="submit"
              className="auth-submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'Resetting...' : 'Reset Password'} <FaArrowRight />
            </motion.button>
          </form>

          <div className="auth-footer">
            <p>Remember your password? <Link to="/login">Back to Login</Link></p>
          </div>
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
           width: 100%;
           box-sizing: border-box;
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

export default ResetPassword;
