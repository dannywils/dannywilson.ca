import React from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import Link from 'gatsby-link';

import TwitterIcon from 'react-icons/lib/fa/twitter';
import LinkedInIcon from 'react-icons/lib/fa/linkedin';
import HomeIcon from 'react-icons/lib/fa/home';
import UserIcon from 'react-icons/lib/fa/user';

import './all.sass';

export default ({
  children,
  data: {
    site: { siteMetadata: { title, subtitle } },
    allMarkdownRemark: { edges }
  }
}) => (
  <React.Fragment>
    <Helmet title={title} />
    <section className="hero is-info is-small block">
      <div className="hero-body has-text-centered">
        <h1 className="title is-size-1">
          <Link to="/">{title}</Link>
        </h1>
        <h2 className="subtitle">{subtitle}</h2>
      </div>
      <div className="column is-5 container is-paddingless">
        <nav className="tabs is-boxed is-centered is-fullwidth">
          <ul>
            <li>
              <Link to="/" exact activeClassName="is-active is-large">
                <HomeIcon />&nbsp;Home
              </Link>
            </li>

            <li>
              <Link to="/about" exact activeClassName="is-active is-large">
                <UserIcon />&nbsp;About
              </Link>
            </li>

            <li>
              <a href="https://www.linkedin.com/in/dannywils/">
                <LinkedInIcon />&nbsp;LinkedIn
              </a>
            </li>

            <li>
              <a href="https://twitter.com/dannywils">
                <TwitterIcon />&nbsp;Twitter
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </section>
    <div className="container">{children()}</div>
  </React.Fragment>
);

export const pageQuery = graphql`
  query layoutQuery {
    site {
      siteMetadata {
        title
        subtitle
      }
    }
    allMarkdownRemark(
      filter: { frontmatter: { templateKey: { eq: "page" } } }
    ) {
      edges {
        node {
          frontmatter {
            templateKey
            path
            menuTitle
          }
        }
      }
    }
  }
`;
