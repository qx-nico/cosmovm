import React from 'react';
import SearchBar from '@theme-original/SearchBar';
import BrowserOnly from '@docusaurus/BrowserOnly';

/** It's a public API key, so it's safe to expose it here */
const COOKBOOK_PUBLIC_API_KEY = "";

export default function SearchBarWrapper(props) {
  return (
    <>
      <SearchBar {...props} />
      <BrowserOnly>{() => <AskCookbook apiKey={COOKBOOK_PUBLIC_API_KEY} />}</BrowserOnly>
    </>
  );
}
