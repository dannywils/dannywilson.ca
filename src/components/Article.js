import React from 'react';
import ReactOverdrive from 'react-overdrive';

const Overdrive =
  typeof window === 'undefined' || document.location.pathname === '/admin/'
    ? 'div'
    : ReactOverdrive;

const Article = ({ title, subtitle, content, id }) => (
  <div className="block">
    <Overdrive id={id}>
      <div className="card ">
        <div className="card-content">
          <h2 className="title">{title}</h2>
          {subtitle && <p className="subtitle is-size-6">{subtitle}</p>}
          <div className="content">{content}</div>
        </div>
      </div>
    </Overdrive>
  </div>
);

export default Article;
