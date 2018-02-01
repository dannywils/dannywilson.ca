import React from 'react';
import ReactOverdrive from 'react-overdrive';

const Overdrive =
  typeof window === 'undefined' ? React.Fragment : ReactOverdrive;

const Article = ({ title, subtitle, content, id }) => (
  <div className="block">
    <Overdrive id={id}>
      <div className="card ">
        <div className="card-content">
          <h2 className="title">{title}</h2>
          {subtitle && <p className="subtitle is-size-6">{subtitle}</p>}
          <p className="content">{content}</p>
        </div>
      </div>
    </Overdrive>
  </div>
);

export default Article;
