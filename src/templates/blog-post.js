import React from 'react';
import graphql from 'graphql';
import Helmet from 'react-helmet';
import Content, { HTMLContent } from '../components/Content';

import Article from '../components/Article';

export default ({ data }) => {
  const {
    markdownRemark: { html, id, frontmatter: { description, title, date } }
  } = data;

  return (
    <React.Fragment>
      <Helmet title={title} />
      <div className="column is-8 container">
        <Article
          id={id}
          title={title}
          subtitle={date}
          content={<HTMLContent content={`<p>${description}</p>` + html} />}
        />
      </div>
    </React.Fragment>
  );
};

export const pageQuery = graphql`
  query BlogPostByPath($path: String!) {
    markdownRemark(frontmatter: { path: { eq: $path } }) {
      html
      id
      frontmatter {
        path
        date(formatString: "MMMM DD, YYYY")
        title
        description
      }
    }
  }
`;
