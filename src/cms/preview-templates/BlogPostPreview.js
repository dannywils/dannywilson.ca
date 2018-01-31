import React from 'react';
import Article from '../../components/Article';

const BlogPostPreview = ({ entry, widgetFor }) => (
  <Article
    content={entry.getIn(['data', 'description']) + widgetFor('body')}
    title={entry.getIn(['data', 'title'])}
  />
);

export default BlogPostPreview;
