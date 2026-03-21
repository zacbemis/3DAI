import React from 'react';
import './nav_bar.css';

interface NavbarProps {
    onLoginClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick }) => {
    return (
        <nav className="navbar">
            <div className="nav-logo">3DAI</div>
            <div className="nav-actions">
                <button
                  type="button"
                  className="nav-btn signup"
                  onClick={onLoginClick}
                >
                  Sign up
                </button>
            </div>
        </nav>
    );
};

export default Navbar;