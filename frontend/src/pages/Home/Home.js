import React from "react";
import "./Home.css";

const Home = () => {
  return (
    <main className="home-container">
      <section className="hero">
        <h1>Welcome to PS Carrier Inc.</h1>
        <p>Family owned and operated trucking company based in Houston, Texas.</p>
      </section>

      <section className="about">
        <h2>About Us</h2>
        <p>
          PS Carrier Inc. has been proudly serving our customers with dedication
          and reliability. As a family-run business, we understand the value of
          trust, commitment, and long-lasting relationships.
        </p>
      </section>

      <section className="mission">
        <h2>Our Mission</h2>
        <p>
          To deliver freight safely and on time while treating our drivers and
          clients like family. We take pride in our professional service and
          strong work ethic.
        </p>
      </section>

      <section className="contact">
        <h2>Get in Touch</h2>
        <p>
          Ready to move your freight with a company that cares? Contact PS
          Carrier Inc. today and experience the difference.
        </p>
              <a className="contact-btn" href="tel:+12816362120">Contact Us</a>
      </section>
    </main>
  );
};

export default Home;