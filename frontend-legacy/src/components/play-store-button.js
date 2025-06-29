'use client';

import React from 'react';

const PlayStoreButton = ({ url }) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-block' }}
    >
      <img
        src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
        alt="Get it on Google Play"
        style={{ height: 60 }}
      />
    </a>
  );
};

export default PlayStoreButton;
