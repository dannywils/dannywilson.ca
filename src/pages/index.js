import React from 'react';
import { graphql } from 'gatsby';
import Helmet from 'react-helmet';

import './style.css';

export default class extends React.Component {
  render() {
    const {
      data: {
        site: {
          siteMetadata: { title, subtitle }
        }
      }
    } = this.props;

    return (
      <React.Fragment>
        <Helmet title={title} />
        <h1>{title}</h1>
        <h2>{subtitle}</h2>
        <a href="mailto:danny@dannywilson.ca" title="Contact me">
          <span role="img" aria-label="Mail icon">
            📧
          </span>
        </a>
      </React.Fragment>
    );
  }
}
export const pageQuery = graphql`
  query pageQuery {
    site {
      siteMetadata {
        title
        subtitle
      }
    }
  }
`;
