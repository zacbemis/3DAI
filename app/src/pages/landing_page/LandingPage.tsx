import React from 'react';
import Navbar from '../../components/nav_bar/nav_bar'; 
import './LandingPage.css';

interface LandingPageProps {
    onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
    return (
        <div className="landing-page-wrapper page-fade-in">
            {/* Pass the function to your existing Navbar component */}
            <Navbar onLoginClick={onLoginClick} />
            
            <h1 className="hero-title">Welcome to 3DAI</h1>
            <button className="start-btn" onClick={onLoginClick}>
                Get Started
            </button>
        </div>
    );
};

export default LandingPage;
