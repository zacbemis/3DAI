import React, { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

const UpdatePassword = ({ onComplete }: { onComplete: () => void }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        const supabase = getSupabaseClient();

        // This is the magic function that updates the password for the current "Recovery" session
        const { error } = await supabase.auth.updateUser({ 
            password: newPassword 
        });

        if (error) {
            setError(error.message);
        } else {
            alert("Password updated successfully!");
            onComplete(); // Send them back to Login
        }
        setLoading(false);
    };

    return (
        <div className="reset-card">
            <h2>Create New Password</h2>
            <form onSubmit={handleUpdate} className="reset-form">
                {error && <p className="reset-error">{error}</p>}
                <div className="input-field">
                    <label>New Password</label>
                    <input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        required 
                    />
                </div>
                <div className="input-field">
                    <label>Confirm New Password</label>
                    <input 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        required 
                    />
                </div>
                <button type="submit" className="reset-main-btn" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>
    );
};

export default UpdatePassword;