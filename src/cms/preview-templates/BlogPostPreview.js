import React from 'react';
import Article from '../../components/Article';

const BlogPostPreview = ({ entry, widgetFor }) => (
  <Article
    content={
      <div>
        <p>{entry.getIn(['data', 'description'])}</p>
        {widgetFor('body')}
      </div>
    }
    title={entry.getIn(['data', 'title'])}
  />
);

export default BlogPostPreview;
