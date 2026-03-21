import React, { useState } from 'react';
import './ResetPassword.css';
import { getSupabaseClient } from '../../lib/supabaseClient';

interface ResetPasswordProps {
    onBackToLogin: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onBackToLogin }) => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        // 1. Reset State
        setErrorMessage(null);

        // 2. Syntax Validation (The "@something.something" rule)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setErrorMessage("Please enter a valid email (e.g., name@domain.com)");
            return;
        }

        setIsLoading(true);

        try {
            const supabase = getSupabaseClient();
            
            const redirectTo = import.meta.env.VITE_SUPABASE_REDIRECT_TO;

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectTo || window.location.origin,
            });

            if (error) throw error;

            // Success
            setIsSubmitted(true);
        } catch (err: unknown) {
            setErrorMessage(
                err instanceof Error ? err.message : 'Failed to send reset link. Please try again.'
            );
        } finally {
            setIsLoading(false);
        }
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
                            {errorMessage && (
                                <div className="error-banner">
                                    {errorMessage}
                                </div>
                            )}

                            <div className="input-field">
                                <label>Email Address</label>
                                <input 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required 
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                type="submit"
                                className="reset-main-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="success-state animate-fade-in">
                        <div className="success-icon">
                            <span>✓</span>
                        </div>
                        <h2>Check your email</h2>
                        <p>
                            If an account exists for <br />
                            <span className="user-email-display">{email}</span>, we sent a reset link.
                        </p>
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