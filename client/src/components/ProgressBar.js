import React from "react";

const ProgressBar = ({ value, max }) => (
    <progress id="progressBar" value={value} max={max} style={{ display: value > 0 ? "block" : "none" }}></progress>
);

export default ProgressBar;
