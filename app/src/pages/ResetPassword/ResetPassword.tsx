import React, { useState } from 'react';
import './ResetPassword.css';

interface ResetPasswordProps {
    onBackToLogin: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onBackToLogin }) => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log("Password reset requested for:", email);
        setIsSubmitted(true);
    };

    return (
        <div className="reset-container page-fade-in">
            <button className="back-arrow" onClick={onBackToLogin}>
                ← Back to Login
            </button>

            <div className="reset-card">
                {!isSubmitted ? (
                    <>
                        <div className="reset-header">
                            <h2>Reset Password</h2>
                            <p>Enter your email address and we'll send you a link to reset your password.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="reset-form">
                            <div className="input-field">
                                <label>Email Address</label>
                                <input 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required 
                                />
                            </div>

                            <button type="submit" className="reset-main-btn">
                                Send Reset Link
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="success-state">
                        <div className="success-icon">
                            <span>✓</span>
                        </div>
                        <h2>Check your email</h2>
                        <p>We've sent a password reset link to <br/><strong>{email}</strong></p>
                        <button className="reset-main-btn" onClick={onBackToLogin}>
                            Return to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;