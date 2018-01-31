const nodePath = require('path');

exports.createPages = ({ boundActionCreators, graphql }) => {
  const { createPage } = boundActionCreators;

  return graphql(`
    {
      allMarkdownRemark(sort: { order: DESC, fields: [frontmatter___date] }, limit: 1000) {
        edges {
          node {
            excerpt(pruneLength: 400)
            html
            id
            frontmatter {
              templateKey
              path
              date
              title
              description
            }
          }
        }
      }
    }
  `).then(result => {
    if (result.errors) {
      result.errors.forEach(e => console.error(e.toString()));
      return Promise.reject(result.errors);
    }

    return result.data.allMarkdownRemark.edges.forEach(
      ({ node: { frontmatter: { path, templateKey } } }) => {
        createPage({
          path,
          component: nodePath.resolve(`src/templates/${String(templateKey)}.js`),
          // additional data can be passed via context
          context: {
            path
          }
        });
      }
    );
  });
};
