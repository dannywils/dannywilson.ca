import React from 'react';
import Link from 'gatsby-link';
import Script from 'react-load-script';
import graphql from 'graphql';

import Article from '../components/Article';

export default class IndexPage extends React.Component {
  handleScriptLoad() {
    if (typeof window !== `undefined` && window.netlifyIdentity) {
      window.netlifyIdentity.on('init', user => {
        if (!user) {
          window.netlifyIdentity.on('login', () => {
            document.location.href = '/admin/';
          });
        }
      });
    }
    window.netlifyIdentity.init();
  }

  render() {
    const { data: { allMarkdownRemark: { edges } } } = this.props;

    return (
      <section className="columns">
        <Script
          url="https://identity.netlify.com/v1/netlify-identity-widget.js"
          onLoad={() => this.handleScriptLoad()}
        />

        <div className="column is-6 container">
          {edges
            .filter(post => post.node.frontmatter.templateKey === 'blog-post')
            .map(
              ({
                node: {
                  excerpt,
                  id,
                  frontmatter: { title, path, date, content },
                },
              }) => (
                <Article
                  key={id}
                  id={id}
                  title={<Link to={path}>{title}</Link>}
                  subtitle={date}
                  content={excerpt}
                />
              )
            )}
        </div>
      </section>
    );
  }
}

export const pageQuery = graphql`
  query IndexQuery {
    allMarkdownRemark(sort: { order: DESC, fields: [frontmatter___date] }) {
      edges {
        node {
          excerpt(pruneLength: 400)
          id
          frontmatter {
            title
            templateKey
            date(formatString: "MMMM DD, YYYY")
            path
          }
        }
      }
    }
  }
`;
