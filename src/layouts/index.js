import React from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import Link from 'gatsby-link';

import './all.sass';

export default ({ children }) => (
  <React.Fragment>
    <Helmet title="Danny Wilson" />
    <section className="hero is-info block">
      <Link to="/">
        <div className="hero-body has-text-centered">
          <h1 className="title is-size-1">Danny Wilson</h1>
          <h2 className="subtitle">
            A Full-Stack Software Developer from Halifax, Nova Scotia
          </h2>
        </div>
      </Link>
    </section>
    <div className="container">{children()}</div>
  </React.Fragment>
);
