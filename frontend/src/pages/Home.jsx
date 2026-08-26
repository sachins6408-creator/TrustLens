import React from 'react';
import WebsiteSearch from '../components/WebsiteSearch';

const Home = () => {
  return (
    <div>
      <section className="hero-section">
        <h1 className="hero-title">Website Evaluation & Trust Assessment System</h1>
        <p className="hero-subtitle">
          Assess e-commerce and service website trustworthiness using multi-parameter evaluation dimensions.
        </p>
      </section>

      {/* Website Search Section */}
      <WebsiteSearch />
    </div>
  );
};

export default Home;
