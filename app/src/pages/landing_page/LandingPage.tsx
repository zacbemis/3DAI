import React from 'react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    return (
        <div className="landing-page-wrapper">
            <h1 className="hero-title">Welcome to 3DAI</h1>
            <p className="hero-description">Your intelligent 3D assistant.</p>
            <button className="start-btn">Get Started</button>
        </div>
    );
};

export default LandingPage;