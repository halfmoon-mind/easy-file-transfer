import React, { MouseEventHandler } from 'react';

export interface ButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
}
const DownloadButton = ({ onClick }: ButtonProps) => (
  <button id="downloadButton" onClick={onClick}>
    Download Selected File
  </button>
);

export default DownloadButton;
