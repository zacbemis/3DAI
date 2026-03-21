import React from 'react';
import './nav_bar.css';

interface NavbarProps {
    onLoginClick: () => void;
    onChatClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onChatClick }) => {
    return (
        <nav className="navbar">
            <div className="nav-logo">3DAI</div>
            <div className="nav-actions">
                <button
                  type="button"
                  className="nav-btn signup"
                  onClick={onLoginClick}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className="nav-btn chat"
                  onClick={onChatClick}
                >
                  Chat
                </button>
            </div>
        </nav>
    );
};

export default Navbar;